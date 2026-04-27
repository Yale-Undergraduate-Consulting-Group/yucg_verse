import base64
import math
import os
import sys
import tempfile
import pandas as pd
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import io
import re

# Make the condensed pipeline importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "condensed_transcript_sentiment_analysis_pipeline"))
from full_sentiment_analyzer_pipeline import (
    stage_00_parse_transcripts,
    stage_01_tag_roles,
    stage_02_sentence_level,
    stage_03_hf_sentiment,
    stage_04_separate_services,
    stage_05_canva_word_stats,
    stage_06_plot_word_sentiment,
    POS_THRESHOLD,
    NEG_THRESHOLD,
    DEFAULT_PLOT_TITLE,
    DEFAULT_PLOT_XLABEL,
    DEFAULT_PLOT_YLABEL,
)

# Import Reddit sentiment analyzer (optional — requires .env with Reddit credentials)
_reddit_available = False
try:
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "reddit-sentiment-analyzer"))
    from reddit_sentiment_analyzer import (
        analyze_reddit_sentiment,
        analyze_multiple_subreddits,
    )
    _reddit_available = True
except Exception as _e:
    print(f"[warning] Reddit sentiment analyzer unavailable: {_e}")

# Import Google Reviews analyzer (optional — requires GOOGLE_PLACES_API_KEY in .env)
_google_available = False
try:
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "google-reviews-analyzer"))
    from google_reviews_analyzer import search_places, analyze_places
    _google_available = True
except Exception as _e:
    print(f"[warning] Google Reviews analyzer unavailable: {_e}")


# Analytics
from analytics import init_db, record as analytics_record

_REDDIT_UNAVAILABLE = {"success": False, "error": "Reddit analyzer unavailable — set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET in backend/.env"}

app = FastAPI(
    title="YUCG Analytics API",
    version="1.0.0"
)

# Initialise analytics DB
init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://yucg-analytics.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Pydantic models ─────────────────────────────────────────────────────────
class RegeneratePlotRequest(BaseModel):
    word_stats:     list[dict]
    company:        str
    other_services: list[str] = []
    title:          Optional[str] = None
    xlabel:         Optional[str] = None
    ylabel:         Optional[str] = None


class RedditAnalysisRequest(BaseModel):
    subreddit: str
    query: str
    time_filter: Optional[str] = "year"
    limit: Optional[int] = None


class RedditMultiSubredditRequest(BaseModel):
    subreddits: List[str]
    query: str
    time_filter: Optional[str] = "year"
    limit: Optional[int] = None


class GooglePlacesSearchRequest(BaseModel):
    query: str


class GoogleReviewsAnalysisRequest(BaseModel):
    places: List[dict]   # [{place_id, data_id, name, address, lat, lng, ...}, ...]
    n: int = 3


class AnalyticsEventRequest(BaseModel):
    event_type: str
    metadata: dict = {}


class AnalyticsVerifyRequest(BaseModel):
    password: str


# Health check
@app.get("/health")
async def health_check():
    return {"status": "ok"}


# Transcript sentiment analysis — generalized for any target company
@app.post("/api/analyze_transcripts")
async def analyze_transcripts(
    files:          List[UploadFile] = File(...),
    company:        str              = Form(...),
    other_services: str              = Form(""),
):
    """
    Analyze interview transcripts for sentiment toward a specified company.

    Accepts:
        files:          One or more .docx or .txt transcript files.
        company:        The company to focus on (e.g. "Canva", "Figma").
                        Sentences mentioning this company are analyzed for
                        word-sentiment associations in stages 05 and 06.
        other_services: Comma-separated list of competitor/other service names
                        entered by the user (e.g. "adobe, sketch, xd").
                        Stage 04 uses this to separate pure target-company
                        sentences from competitor-mention sentences.
                        Leave empty to skip competitor separation.

    Returns per-interviewee sentiment summary plus an overall word-sentiment
    scatter plot encoded as a base64 PNG string.
    """
    parsed_other_services = (
        [s.strip() for s in other_services.split(",") if s.strip()]
        if other_services.strip()
        else []
    )

    results = []
    _sentence_count = 0

    for file in files:
        fname = file.filename or "unknown"
        if not fname.lower().endswith((".docx", ".txt", ".pdf")):
            results.append({"filename": fname, "error": "Only .docx, .txt, and .pdf files are supported"})

    valid_files = [f for f in files if (f.filename or "").lower().endswith((".docx", ".txt", ".pdf"))]
    if not valid_files:
        return {"results": results}

    try:
        with tempfile.TemporaryDirectory() as tmp_dir:
            for file in valid_files:
                dest    = os.path.join(tmp_dir, file.filename)
                content = await file.read()
                with open(dest, "wb") as f:
                    f.write(content)

            combined_df  = stage_00_parse_transcripts(tmp_dir)
            combined_df  = stage_01_tag_roles(combined_df)
            sentences_df = stage_02_sentence_level(combined_df)
            sentiment_df = stage_03_hf_sentiment(sentences_df)
            _sentence_count = int(len(sentiment_df))

            df_target, df_other = stage_04_separate_services(
                sentiment_df, company, parsed_other_services or None
            )

        for interviewee in sentiment_df["interviewee"].unique():
            idf = sentiment_df[sentiment_df["interviewee"] == interviewee]

            avg_compound = float(idf["hf_compound"].mean())
            if math.isnan(avg_compound):
                avg_compound = 0.0
            if avg_compound >= POS_THRESHOLD:
                overall_sentiment = "positive"
            elif avg_compound <= NEG_THRESHOLD:
                overall_sentiment = "negative"
            else:
                overall_sentiment = "neutral"

            dist = idf["hf_label"].value_counts().to_dict()

            target_count = int(len(df_target[df_target["interviewee"] == interviewee]))
            other_count  = int(len(df_other[df_other["interviewee"] == interviewee]))

            idf_target     = df_target[df_target["interviewee"] == interviewee]
            idf_word_stats = stage_05_canva_word_stats(idf_target, company)
            top_words      = idf_word_stats.head(10).to_dict(orient="records")

            results.append({
                "filename":              interviewee,
                "interviewee":           interviewee,
                "target_company":        company,
                "sentence_count":        int(len(idf)),
                "avg_compound":          round(avg_compound, 4),
                "sentiment":             overall_sentiment,
                "target_sentence_count": target_count,
                "other_service_count":   other_count,
                "sentiment_distribution": {
                    "positive": int(dist.get("positive", 0)),
                    "neutral":  int(dist.get("neutral",  0)),
                    "negative": int(dist.get("negative", 0)),
                },
                "top_words": top_words,
            })

    except Exception as e:
        results.append({"filename": "pipeline", "error": str(e)})

    overall_plot: str | None = None
    word_stats_json: list    = []
    try:
        all_word_stats  = stage_05_canva_word_stats(df_target, company)
        word_stats_json = all_word_stats.to_dict(orient="records")
        with tempfile.TemporaryDirectory() as plot_tmp:
            stage_06_plot_word_sentiment(all_word_stats, plot_tmp, company)
            slug      = re.sub(r"[^a-z0-9]+", "_", company.lower()).strip("_")
            plot_path = os.path.join(plot_tmp, f"{slug}_word_freq_sentiment.png")
            if os.path.exists(plot_path):
                with open(plot_path, "rb") as f:
                    overall_plot = base64.b64encode(f.read()).decode("utf-8")
    except Exception:
        pass

    # Record analytics
    analytics_record("transcript_analysis", {
        "success": any("error" not in r for r in results),
        "file_count": len(valid_files),
        "company": company,
        "sentence_count": _sentence_count,
    })
    if overall_plot:
        analytics_record("graph_generated", {"company": company})

    return {"results": results, "overall_plot": overall_plot, "word_stats": word_stats_json}


@app.post("/api/regenerate_plot")
async def regenerate_plot(req: RegeneratePlotRequest):
    """
    Regenerate the word-sentiment scatter plot with updated axis labels.
    Called by the frontend "Update labels" button.
    """
    overall_plot: str | None = None
    try:
        word_df = pd.DataFrame(req.word_stats)
        company = req.company
        with tempfile.TemporaryDirectory() as plot_tmp:
            stage_06_plot_word_sentiment(
                word_df,
                plot_tmp,
                company,
                title=req.title,
                xlabel=req.xlabel,
                ylabel=req.ylabel,
            )
            slug      = re.sub(r"[^a-z0-9]+", "_", company.lower()).strip("_")
            plot_path = os.path.join(plot_tmp, f"{slug}_word_freq_sentiment.png")
            if os.path.exists(plot_path):
                with open(plot_path, "rb") as f:
                    overall_plot = base64.b64encode(f.read()).decode("utf-8")
    except Exception as e:
        return {"error": str(e)}

    if overall_plot:
        analytics_record("plot_regenerated", {"company": req.company})

    return {"overall_plot": overall_plot}


# Reddit Sentiment Analysis Endpoints
@app.post("/api/reddit/analyze")
def analyze_reddit(req: RedditAnalysisRequest):
    if not _reddit_available:
        return _REDDIT_UNAVAILABLE
    try:
        result = analyze_reddit_sentiment(
            subreddit=req.subreddit,
            query=req.query,
            time_filter=req.time_filter or "year",
            limit=req.limit
        )
        analytics_record("reddit_analysis", {
            "success": result.get("success", False),
            "mode": "single",
            "subreddit_count": 1,
            "subreddit": req.subreddit,
            "post_count": result.get("total_posts", 0),
        })
        return result
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/reddit/analyze_multi")
def analyze_reddit_multi(req: RedditMultiSubredditRequest):
    if not _reddit_available:
        return _REDDIT_UNAVAILABLE
    try:
        result = analyze_multiple_subreddits(
            subreddits=req.subreddits,
            query=req.query,
            time_filter=req.time_filter or "year",
            limit=req.limit
        )
        analytics_record("reddit_analysis", {
            "success": result.get("success", False),
            "mode": "multi",
            "subreddit_count": len(req.subreddits),
            "post_count": result.get("total_posts", 0),
        })
        return result
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/reddit/download_csv")
def download_reddit_csv(req: RedditAnalysisRequest):
    if not _reddit_available:
        return _REDDIT_UNAVAILABLE
    try:
        result = analyze_reddit_sentiment(
            subreddit=req.subreddit,
            query=req.query,
            time_filter=req.time_filter or "year",
            limit=req.limit
        )

        if not result.get("success") or not result.get("csv_data"):
            return {"success": False, "error": "No data to download"}

        csv_data = result["csv_data"]
        filename = f"reddit_{req.subreddit}_{req.query.replace(' ', '_')}_sentiment.csv"

        analytics_record("csv_downloaded", {"mode": "single", "subreddit": req.subreddit})

        return StreamingResponse(
            io.StringIO(csv_data),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/reddit/download_csv_multi")
def download_reddit_csv_multi(req: RedditMultiSubredditRequest):
    if not _reddit_available:
        return _REDDIT_UNAVAILABLE
    try:
        result = analyze_multiple_subreddits(
            subreddits=req.subreddits,
            query=req.query,
            time_filter=req.time_filter or "year",
            limit=req.limit
        )

        if not result.get("success") or not result.get("csv_data"):
            return {"success": False, "error": "No data to download"}

        csv_data = result["csv_data"]
        subreddits_str = "_".join(req.subreddits[:3])
        filename = f"reddit_{subreddits_str}_{req.query.replace(' ', '_')}_sentiment.csv"

        analytics_record("csv_downloaded", {"mode": "multi", "subreddit_count": len(req.subreddits)})

        return StreamingResponse(
            io.StringIO(csv_data),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        return {"success": False, "error": str(e)}


# Google Reviews Endpoints
_GOOGLE_UNAVAILABLE = {"success": False, "error": "Google Reviews analyzer unavailable — set GOOGLE_PLACES_API_KEY in backend/.env"}


@app.post("/api/google/search_places")
async def google_search_places(req: GooglePlacesSearchRequest):
    if not _google_available:
        return _GOOGLE_UNAVAILABLE
    try:
        results = search_places(req.query)
        return {"success": True, "results": results}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/google/analyze_reviews")
async def google_analyze_reviews(req: GoogleReviewsAnalysisRequest):
    if not _google_available:
        return _GOOGLE_UNAVAILABLE
    n = max(1, min(30, req.n))
    try:
        results = analyze_places(req.places, n)
        analytics_record("google_reviews_analysis", {
            "success": True,
            "place_count": len(req.places),
            "n": n,
            "review_count": sum(r.get("total_reviews_analyzed", 0) for r in results if isinstance(r, dict)),
        })
        return {"success": True, "results": results}
    except Exception as e:
        analytics_record("google_reviews_analysis", {"success": False})
        return {"success": False, "error": str(e)}


# Analytics endpoints
@app.post("/api/analytics/verify")
async def verify_analytics(req: AnalyticsVerifyRequest):
    expected = os.getenv("ANALYTICS_PASSWORD", "")
    if not expected:
        return {"ok": False, "error": "ANALYTICS_PASSWORD not set in backend/.env"}
    if req.password == expected:
        return {"ok": True}
    return {"ok": False, "error": "Incorrect password"}


@app.post("/api/analytics/event")
async def track_event(req: AnalyticsEventRequest):
    analytics_record(req.event_type, req.metadata)
    return {"ok": True}


@app.get("/api/analytics/summary")
async def get_analytics_summary():
    from analytics import summary as analytics_summary_fn
    return analytics_summary_fn()


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

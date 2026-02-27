import base64
import math
import os
import sys
import tempfile
import pandas as pd
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import io

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

_REDDIT_UNAVAILABLE = {"success": False, "error": "Reddit analyzer unavailable — set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET in backend/.env"}

app = FastAPI(
    title="YUCG Analytics API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RegeneratePlotRequest(BaseModel):
    word_stats: list[dict]
    title: Optional[str] = None
    xlabel: Optional[str] = None
    ylabel: Optional[str] = None


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


# Health check
@app.get("/health")
async def health_check():
    return {"status": "ok"}


# Transcript sentiment analysis using the full HuggingFace pipeline
@app.post("/api/analyze_transcripts")
async def analyze_transcripts(files: List[UploadFile] = File(...)):
    results = []

    # Validate file types upfront
    for file in files:
        fname = file.filename or "unknown"
        if not (fname.lower().endswith(".docx") or fname.lower().endswith(".txt")):
            results.append({"filename": fname, "error": "Only .docx and .txt files are supported"})

    valid_files = [f for f in files if (f.filename or "").lower().endswith((".docx", ".txt"))]
    if not valid_files:
        return {"results": results}

    try:
        with tempfile.TemporaryDirectory() as tmp_dir:
            # Save uploaded files to temp directory
            for file in valid_files:
                dest = os.path.join(tmp_dir, file.filename)
                content = await file.read()
                with open(dest, "wb") as f:
                    f.write(content)

            # Run pipeline stages 00–05 (no plotting)
            combined_df  = stage_00_parse_transcripts(tmp_dir)
            combined_df  = stage_01_tag_roles(combined_df)
            sentences_df = stage_02_sentence_level(combined_df)
            sentiment_df = stage_03_hf_sentiment(sentences_df)
            df_canva, df_other = stage_04_separate_services(sentiment_df)

        # Build one result entry per interviewee
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

            canva_count = int(len(df_canva[df_canva["interviewee"] == interviewee]))
            other_count = int(len(df_other[df_other["interviewee"] == interviewee]))

            # Top words associated with this interviewee's Canva sentences
            idf_canva = df_canva[df_canva["interviewee"] == interviewee]
            idf_word_stats = stage_05_canva_word_stats(idf_canva)
            top_words = idf_word_stats.head(10).to_dict(orient="records")

            results.append({
                "filename":       interviewee,
                "interviewee":    interviewee,
                "sentence_count": int(len(idf)),
                "avg_compound":   round(avg_compound, 4),
                "sentiment":      overall_sentiment,
                "canva_sentence_count":  canva_count,
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

    # Generate overall frequency × sentiment scatter plot across all transcripts
    overall_plot: str | None = None
    word_stats_json: list = []
    try:
        all_word_stats = stage_05_canva_word_stats(df_canva)
        word_stats_json = all_word_stats.to_dict(orient="records")
        with tempfile.TemporaryDirectory() as plot_tmp:
            stage_06_plot_word_sentiment(all_word_stats, plot_tmp)
            plot_path = os.path.join(plot_tmp, "canva_word_freq_sentiment.png")
            if os.path.exists(plot_path):
                with open(plot_path, "rb") as f:
                    overall_plot = base64.b64encode(f.read()).decode("utf-8")
    except Exception:
        pass  # plot is optional — don't fail the whole response

    return {"results": results, "overall_plot": overall_plot, "word_stats": word_stats_json}


@app.post("/api/regenerate_plot")
async def regenerate_plot(req: RegeneratePlotRequest):
    overall_plot: str | None = None
    try:
        word_df = pd.DataFrame(req.word_stats)
        with tempfile.TemporaryDirectory() as plot_tmp:
            stage_06_plot_word_sentiment(
                word_df, plot_tmp,
                title=req.title,
                xlabel=req.xlabel,
                ylabel=req.ylabel,
            )
            plot_path = os.path.join(plot_tmp, "canva_word_freq_sentiment.png")
            if os.path.exists(plot_path):
                with open(plot_path, "rb") as f:
                    overall_plot = base64.b64encode(f.read()).decode("utf-8")
    except Exception as e:
        return {"error": str(e)}
    return {"overall_plot": overall_plot}


# Reddit Sentiment Analysis Endpoints
@app.post("/api/reddit/analyze")
async def analyze_reddit(req: RedditAnalysisRequest):
    if not _reddit_available:
        return _REDDIT_UNAVAILABLE
    try:
        result = analyze_reddit_sentiment(
            subreddit=req.subreddit,
            query=req.query,
            time_filter=req.time_filter or "year",
            limit=req.limit
        )
        return result
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/reddit/analyze_multi")
async def analyze_reddit_multi(req: RedditMultiSubredditRequest):
    if not _reddit_available:
        return _REDDIT_UNAVAILABLE
    try:
        result = analyze_multiple_subreddits(
            subreddits=req.subreddits,
            query=req.query,
            time_filter=req.time_filter or "year",
            limit=req.limit
        )
        return result
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/reddit/download_csv")
async def download_reddit_csv(req: RedditAnalysisRequest):
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

        return StreamingResponse(
            io.StringIO(csv_data),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/reddit/download_csv_multi")
async def download_reddit_csv_multi(req: RedditMultiSubredditRequest):
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
        subreddits_str = "_".join(req.subreddits[:3])  # Limit filename length
        filename = f"reddit_{subreddits_str}_{req.query.replace(' ', '_')}_sentiment.csv"

        return StreamingResponse(
            io.StringIO(csv_data),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        return {"success": False, "error": str(e)}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

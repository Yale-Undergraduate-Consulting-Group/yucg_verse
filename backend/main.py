import base64
import math
import os
import sys
import tempfile
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import uvicorn

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
)

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
    try:
        all_word_stats = stage_05_canva_word_stats(df_canva)
        with tempfile.TemporaryDirectory() as plot_tmp:
            stage_06_plot_word_sentiment(all_word_stats, plot_tmp)
            plot_path = os.path.join(plot_tmp, "canva_word_freq_sentiment.png")
            if os.path.exists(plot_path):
                with open(plot_path, "rb") as f:
                    overall_plot = base64.b64encode(f.read()).decode("utf-8")
    except Exception:
        pass  # plot is optional — don't fail the whole response

    return {"results": results, "overall_plot": overall_plot}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

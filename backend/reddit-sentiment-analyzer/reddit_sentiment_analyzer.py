"""
Reddit Sentiment Analyzer Pipeline

This module provides functionality to scrape Reddit posts from specified subreddits,
analyze their sentiment using VADER, and return results with a downloadable CSV option.
"""

import os
import re
import math
import io
from datetime import datetime, timezone, timedelta
from typing import Optional
from collections import Counter
from pathlib import Path

from dotenv import load_dotenv
import praw
import pandas as pd
import nltk
from nltk.sentiment.vader import SentimentIntensityAnalyzer
from langdetect import detect, LangDetectException

# Load environment variables from .env file
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)

# Download required NLTK data
nltk.download("vader_lexicon", quiet=True)
nltk.download("stopwords", quiet=True)
nltk.download("brown", quiet=True)

from nltk.corpus import stopwords, brown


# Reddit API credentials loaded from environment variables
REDDIT_CLIENT_ID = os.getenv("REDDIT_CLIENT_ID")
REDDIT_CLIENT_SECRET = os.getenv("REDDIT_CLIENT_SECRET")
REDDIT_USER_AGENT = "Sentiment Analysis Tool"

def get_reddit_client() -> praw.Reddit:
    """Create and return a Reddit API client in read-only mode."""
    if not REDDIT_CLIENT_ID or not REDDIT_CLIENT_SECRET:
        raise ValueError("REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET must be set in backend/.env")
    return praw.Reddit(
        client_id=REDDIT_CLIENT_ID,
        client_secret=REDDIT_CLIENT_SECRET,
        user_agent=REDDIT_USER_AGENT
    )


def scrape_subreddit_posts(
    subreddit_name: str,
    query: str,
    time_filter: str = "year",
    sort: str = "top",
    limit: Optional[int] = None,
    days_back: int = 365
) -> pd.DataFrame:
    """
    Scrape Reddit posts from a subreddit matching a query.

    Args:
        subreddit_name: Name of the subreddit to search
        query: Search query string
        time_filter: Time filter for search ("hour", "day", "week", "month", "year", "all")
        sort: Sort method ("relevance", "hot", "top", "new", "comments")
        limit: Maximum number of posts to retrieve (None for no limit)
        days_back: Number of days back to consider posts from

    Returns:
        DataFrame with scraped post data
    """
    reddit = get_reddit_client()
    subreddit = reddit.subreddit(subreddit_name)

    cutoff = datetime.now(timezone.utc) - timedelta(days=days_back)
    seen = set()
    rows = []

    try:
        for submission in subreddit.search(query, sort=sort, time_filter=time_filter, limit=limit):
            created = datetime.fromtimestamp(submission.created_utc, tz=timezone.utc)

            if created < cutoff:
                continue

            sid = submission.id
            if sid in seen:
                continue
            seen.add(sid)

            title = submission.title or ""
            body = submission.selftext or ""

            # Filter non-English posts
            try:
                if body and detect(body) != 'en':
                    continue
            except LangDetectException:
                # If language detection fails, skip the post
                continue

            rows.append({
                "id": sid,
                "created_utc": created.isoformat(),
                "year": created.year,
                "month": created.month,
                "subreddit": str(submission.subreddit),
                "title": title,
                "text": body,
                "permalink": f"https://www.reddit.com{submission.permalink}",
                "score": submission.score,
                "num_comments": submission.num_comments,
            })
    except Exception as e:
        raise RuntimeError(f"Error scraping subreddit {subreddit_name}: {str(e)}")

    return pd.DataFrame(rows)


def analyze_sentiment(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add sentiment analysis scores to a DataFrame with 'title' and 'text' columns.

    Uses VADER sentiment analyzer to compute compound scores for both
    the title and body text of each post.

    Args:
        df: DataFrame with 'title' and 'text' columns

    Returns:
        DataFrame with added sentiment columns
    """
    if df.empty:
        return df

    sid = SentimentIntensityAnalyzer()

    def get_sentiment_score(text: str) -> float:
        if not text:
            return 0.0
        return sid.polarity_scores(text)["compound"]

    df = df.copy()
    df["title_sentiment"] = df["title"].apply(get_sentiment_score)
    df["text_sentiment"] = df["text"].apply(get_sentiment_score)

    # Combined sentiment (weighted average: text is usually more informative)
    df["combined_sentiment"] = df.apply(
        lambda row: (row["title_sentiment"] * 0.3 + row["text_sentiment"] * 0.7)
        if row["text"] else row["title_sentiment"],
        axis=1
    )

    # Sentiment label based on combined score
    def get_label(score: float) -> str:
        if score >= 0.05:
            return "positive"
        elif score <= -0.05:
            return "negative"
        else:
            return "neutral"

    df["sentiment_label"] = df["combined_sentiment"].apply(get_label)

    return df


def compute_summary_stats(df: pd.DataFrame) -> dict:
    """
    Compute summary statistics for the sentiment analysis results.

    Args:
        df: DataFrame with sentiment columns

    Returns:
        Dictionary with summary statistics
    """
    if df.empty:
        return {
            "total_posts": 0,
            "avg_title_sentiment": 0.0,
            "avg_text_sentiment": 0.0,
            "avg_combined_sentiment": 0.0,
            "sentiment_distribution": {"positive": 0, "neutral": 0, "negative": 0},
            "sentiment_percentages": {"positive": 0.0, "neutral": 0.0, "negative": 0.0},
        }

    dist = df["sentiment_label"].value_counts().to_dict()
    total = len(df)

    return {
        "total_posts": total,
        "avg_title_sentiment": round(df["title_sentiment"].mean(), 4),
        "avg_text_sentiment": round(df["text_sentiment"].mean(), 4),
        "avg_combined_sentiment": round(df["combined_sentiment"].mean(), 4),
        "sentiment_distribution": {
            "positive": int(dist.get("positive", 0)),
            "neutral": int(dist.get("neutral", 0)),
            "negative": int(dist.get("negative", 0)),
        },
        "sentiment_percentages": {
            "positive": round(dist.get("positive", 0) / total * 100, 1) if total > 0 else 0.0,
            "neutral": round(dist.get("neutral", 0) / total * 100, 1) if total > 0 else 0.0,
            "negative": round(dist.get("negative", 0) / total * 100, 1) if total > 0 else 0.0,
        },
    }


def get_monthly_sentiment_trend(df: pd.DataFrame) -> list:
    """
    Compute monthly sentiment trends.

    Args:
        df: DataFrame with sentiment columns and year/month

    Returns:
        List of dictionaries with monthly sentiment data
    """
    if df.empty:
        return []

    monthly = df.groupby(["year", "month"]).agg({
        "combined_sentiment": "mean",
        "id": "count"
    }).reset_index()
    monthly.columns = ["year", "month", "avg_sentiment", "post_count"]
    monthly = monthly.sort_values(["year", "month"])

    return monthly.to_dict(orient="records")


# Keyness analysis helpers
STOPWORDS = set(stopwords.words("english"))
REF_COUNTER = Counter([w.lower() for w in brown.words() if w.isalpha()])
REF_TOTAL = sum(REF_COUNTER.values())


def clean_and_tokenize(text: str) -> list:
    """Clean text and tokenize, removing stopwords."""
    if not isinstance(text, str):
        return []
    text = text.lower()
    text = re.sub(r"http\S+|www\S+", "", text)  # Remove URLs
    text = re.sub(r"[^a-z\s]", " ", text)  # Remove punctuation
    tokens = text.split()
    return [t for t in tokens if t not in STOPWORDS and len(t) > 2]


def llr(k_corpus: int, k_ref: int, n_corpus: int, n_ref: int) -> float:
    """Compute log-likelihood ratio for keyness analysis."""
    E1 = n_corpus * (k_corpus + k_ref) / (n_corpus + n_ref)
    E2 = n_ref * (k_corpus + k_ref) / (n_corpus + n_ref)

    if k_corpus == 0 or k_ref == 0:
        return 0.0

    return 2 * (
        k_corpus * math.log(k_corpus / E1) +
        k_ref * math.log(k_ref / E2)
    )


def get_keyness_words(df: pd.DataFrame, top_n: int = 30) -> list:
    """
    Extract top-N unusually common words in the corpus using log-likelihood ratio.

    Args:
        df: DataFrame with 'text' column
        top_n: Number of top words to return

    Returns:
        List of dictionaries with word, keyness score, and count
    """
    if df.empty:
        return []

    corpus_counter = Counter()
    for text in df["text"]:
        tokens = clean_and_tokenize(text)
        corpus_counter.update(tokens)

    corpus_total = sum(corpus_counter.values())
    if corpus_total == 0:
        return []

    results = []
    for word, count in corpus_counter.items():
        ref_count = REF_COUNTER.get(word, 1)
        keyness = llr(count, ref_count, corpus_total, REF_TOTAL)
        results.append({"word": word, "keyness": round(keyness, 2), "count": count})

    results.sort(key=lambda x: x["keyness"], reverse=True)
    return results[:top_n]


def analyze_reddit_sentiment(
    subreddit: str,
    query: str,
    time_filter: str = "year",
    limit: Optional[int] = None
) -> dict:
    """
    Main function to analyze Reddit sentiment for a given subreddit and query.

    Args:
        subreddit: Name of the subreddit to search
        query: Search query string
        time_filter: Time filter for search
        limit: Maximum number of posts to retrieve

    Returns:
        Dictionary with analysis results including summary stats, posts, and CSV data
    """
    # Scrape posts
    df = scrape_subreddit_posts(
        subreddit_name=subreddit,
        query=query,
        time_filter=time_filter,
        limit=limit
    )

    if df.empty:
        return {
            "success": True,
            "subreddit": subreddit,
            "query": query,
            "summary": compute_summary_stats(df),
            "monthly_trend": [],
            "top_keywords": [],
            "posts": [],
            "csv_data": "",
        }

    # Analyze sentiment
    df = analyze_sentiment(df)

    # Compute statistics
    summary = compute_summary_stats(df)
    monthly_trend = get_monthly_sentiment_trend(df)
    top_keywords = get_keyness_words(df)

    # Prepare posts for response (limit to top 100 by score for the API response)
    top_posts = df.nlargest(100, "score")[
        ["id", "title", "text", "subreddit", "score", "num_comments",
         "created_utc", "permalink", "title_sentiment", "text_sentiment",
         "combined_sentiment", "sentiment_label"]
    ].to_dict(orient="records")

    # Generate CSV data
    csv_buffer = io.StringIO()
    df.to_csv(csv_buffer, index=False)
    csv_data = csv_buffer.getvalue()

    return {
        "success": True,
        "subreddit": subreddit,
        "query": query,
        "summary": summary,
        "monthly_trend": monthly_trend,
        "top_keywords": top_keywords,
        "posts": top_posts,
        "csv_data": csv_data,
    }


def analyze_multiple_subreddits(
    subreddits: list,
    query: str,
    time_filter: str = "year",
    limit: Optional[int] = None
) -> dict:
    """
    Analyze Reddit sentiment across multiple subreddits.

    Args:
        subreddits: List of subreddit names to search
        query: Search query string
        time_filter: Time filter for search
        limit: Maximum number of posts per subreddit

    Returns:
        Dictionary with combined analysis results
    """
    all_dfs = []
    errors = []

    for subreddit in subreddits:
        try:
            df = scrape_subreddit_posts(
                subreddit_name=subreddit,
                query=query,
                time_filter=time_filter,
                limit=limit
            )
            if not df.empty:
                all_dfs.append(df)
        except Exception as e:
            errors.append({"subreddit": subreddit, "error": str(e)})

    if not all_dfs:
        return {
            "success": False,
            "subreddits": subreddits,
            "query": query,
            "errors": errors,
            "summary": compute_summary_stats(pd.DataFrame()),
            "monthly_trend": [],
            "top_keywords": [],
            "posts": [],
            "csv_data": "",
        }

    # Combine all DataFrames
    combined_df = pd.concat(all_dfs, ignore_index=True)
    combined_df = combined_df.drop_duplicates(subset=["id"])

    # Analyze sentiment
    combined_df = analyze_sentiment(combined_df)

    # Compute statistics
    summary = compute_summary_stats(combined_df)
    monthly_trend = get_monthly_sentiment_trend(combined_df)
    top_keywords = get_keyness_words(combined_df)

    # Per-subreddit breakdown
    subreddit_breakdown = []
    for sub in combined_df["subreddit"].unique():
        sub_df = combined_df[combined_df["subreddit"] == sub]
        sub_stats = compute_summary_stats(sub_df)
        sub_stats["subreddit"] = sub
        subreddit_breakdown.append(sub_stats)

    # Prepare posts for response
    top_posts = combined_df.nlargest(100, "score")[
        ["id", "title", "text", "subreddit", "score", "num_comments",
         "created_utc", "permalink", "title_sentiment", "text_sentiment",
         "combined_sentiment", "sentiment_label"]
    ].to_dict(orient="records")

    # Generate CSV data
    csv_buffer = io.StringIO()
    combined_df.to_csv(csv_buffer, index=False)
    csv_data = csv_buffer.getvalue()

    return {
        "success": True,
        "subreddits": subreddits,
        "query": query,
        "errors": errors,
        "summary": summary,
        "subreddit_breakdown": subreddit_breakdown,
        "monthly_trend": monthly_trend,
        "top_keywords": top_keywords,
        "posts": top_posts,
        "csv_data": csv_data,
    }

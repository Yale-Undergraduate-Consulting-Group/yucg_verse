#!/usr/bin/env python3

"""
Role-aware sentiment analysis on combined interview transcripts.

Input:
    all_transcripts_combined.csv
    (assumed columns: at least 'speaker', 'interviewee', 'text')

Output:
    all_transcripts_with_roles_sentiment.csv  # row-level
    role_sentiment_summary.csv                # aggregated summary
"""

import pandas as pd
import nltk
from nltk.sentiment import SentimentIntensityAnalyzer

# -------------------------------------------------------------------
# Setup VADER
# -------------------------------------------------------------------
nltk.download("vader_lexicon", quiet=True)
sia = SentimentIntensityAnalyzer()

INPUT_FILE = "all_transcripts_combined.csv"
OUTPUT_ROWS = "./processed_sentiment/all_transcripts_with_roles_sentiment.csv"
OUTPUT_SUMMARY = "./processed_sentiment/role_sentiment_summary.csv"


def label_sentiment(score: float, pos_th: float = 0.05, neg_th: float = -0.05) -> str:
    """
    Map a VADER compound score to a discrete label.
      >= pos_th  -> 'positive'
      <= neg_th  -> 'negative'
      else       -> 'neutral'
    """
    if score >= pos_th:
        return "positive"
    elif score <= neg_th:
        return "negative"
    else:
        return "neutral"


def main():
    # ---------------------------------------------------------------
    # 1. Load combined transcripts
    # ---------------------------------------------------------------
    df = pd.read_csv(INPUT_FILE)

    # Clean speaker & interviewee strings
    df["speaker"] = df["speaker"].fillna("").astype(str).str.strip()
    df["interviewee"] = df["interviewee"].astype(str).str.strip()
    df["text"] = df["text"].astype(str)

    # ---------------------------------------------------------------
    # 2. Tag each row as interviewee vs interviewer
    # ---------------------------------------------------------------
    # Interviewee speech: speaker name == interviewee name
    df["is_interviewee"] = df["speaker"].eq(df["interviewee"])

    # Interviewer speech: not interviewee + non-empty speaker
    df["is_interviewer"] = (~df["is_interviewee"]) & df["speaker"].ne("")

    # Categorical role label
    def determine_role(row):
        if row["is_interviewee"]:
            return "interviewee"
        elif row["is_interviewer"]:
            return "interviewer"
        else:
            return "unknown"

    df["role"] = df.apply(determine_role, axis=1)

    # ---------------------------------------------------------------
    # 3. Per-row sentiment scores
    # ---------------------------------------------------------------
    df["sentiment"] = df["text"].apply(
        lambda t: sia.polarity_scores(t)["compound"]
    )
    df["sentiment_label"] = df["sentiment"].apply(label_sentiment)

    # ---------------------------------------------------------------
    # 4. Export the enriched row-level file
    # ---------------------------------------------------------------
    df.to_csv(OUTPUT_ROWS, index=False, encoding="utf-8")
    print(f"Saved row-level file with roles + sentiment to: {OUTPUT_ROWS}")

    # ---------------------------------------------------------------
    # 5. Aggregated summary by interviewee & role
    # ---------------------------------------------------------------
    grouped = df.groupby(["interviewee", "role"])

    summary = grouped["sentiment"].agg(
        n_lines="count",
        avg_sentiment="mean",
    ).reset_index()

    # Count sentiment labels per (interviewee, role)
    label_counts = (
        df.groupby(["interviewee", "role", "sentiment_label"])
          .size()
          .unstack(fill_value=0)
    )

    # Ensure columns exist even if some label is absent
    for col in ["positive", "negative", "neutral"]:
        if col not in label_counts.columns:
            label_counts[col] = 0

    label_counts["total"] = label_counts.sum(axis=1)
    label_counts["share_positive"] = label_counts["positive"] / label_counts["total"]
    label_counts["share_negative"] = label_counts["negative"] / label_counts["total"]
    label_counts["share_neutral"]  = label_counts["neutral"]  / label_counts["total"]

    label_counts = label_counts.reset_index()

    # Merge sentiment shares into summary
    summary = summary.merge(
        label_counts[
            ["interviewee", "role", "share_positive", "share_negative", "share_neutral"]
        ],
        on=["interviewee", "role"],
        how="left",
    )

    # ---------------------------------------------------------------
    # 6. Rename 'interviewee' to speaker-like labels in the summary
    # ---------------------------------------------------------------
    # We want:
    #   - for interviewee rows: speaker = "<interviewee name>"
    #   - for interviewer rows: speaker = "<interviewee name>'s interviewer"
    #   (unknown kept as "<interviewee name>'s unknown role" just in case)

    def format_speaker(row):
        name = row["interviewee"]
        if row["role"] == "interviewee":
            return name
        elif row["role"] == "interviewer":
            return f"{name}'s interviewer"
        else:
            return f"{name}'s unknown role"

    summary["speaker"] = summary.apply(format_speaker, axis=1)

    # Drop the original interviewee column if you don't want it duplicated
    summary = summary.drop(columns=["interviewee"])

    # Optional: reorder columns for readability
    summary = summary[
        [
            "speaker",
            "role",
            "n_lines",
            "avg_sentiment",
            "share_positive",
            "share_negative",
            "share_neutral",
        ]
    ]

    # Save summary
    summary.to_csv(OUTPUT_SUMMARY, index=False, encoding="utf-8")
    print(f"Saved role-level sentiment summary to: {OUTPUT_SUMMARY}")

    print("\n=== Summary preview ===")
    print(summary.head())


if __name__ == "__main__":
    main()

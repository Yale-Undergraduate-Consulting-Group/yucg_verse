#!/usr/bin/env python3

import os
import re
import pandas as pd
import nltk
from nltk.sentiment import SentimentIntensityAnalyzer

# -----------------------------------------------------------------------------
# CONFIG
# -----------------------------------------------------------------------------
INPUT_FILE = "sentences_transcripts.csv"  # sentence-level file you already have

# keywords for "professionalism" context
PROF_POS = ["professional", "polished", "clean", "sleek", "high-end", "refined"]
PROF_NEG = ["childish", "cringe", "cringey", "cheap", "unprofessional", "tacky"]

# competing tools – extend as needed
OTHER_TOOLS = ["figma", "procreate", "photoshop", "illustrator", "indesign"]


# -----------------------------------------------------------------------------
# SETUP VADER
# -----------------------------------------------------------------------------
def get_vader():
    """
    Ensure VADER lexicon is available and return a SentimentIntensityAnalyzer.
    """
    nltk.download("vader_lexicon", quiet=True)
    return SentimentIntensityAnalyzer()


sia = get_vader()


# -----------------------------------------------------------------------------
# CORE SENTIMENT FUNCTIONS (sentence-level)
# -----------------------------------------------------------------------------
def add_vader_sentiment(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add VADER compound sentiment for each sentence.
    Uses column 'sentence' and creates:
      - vader_compound (float in [-1,1])
      - vader_label    ('positive'/'neutral'/'negative')
    """

    def score_sentence(text: str) -> float:
        if not isinstance(text, str):
            text = "" if pd.isna(text) else str(text)
        return sia.polarity_scores(text)["compound"]

    df["vader_compound"] = df["sentence"].astype(str).apply(score_sentence)

    def label_from_compound(score, pos_th=0.05, neg_th=-0.05):
        if score >= pos_th:
            return "positive"
        elif score <= neg_th:
            return "negative"
        else:
            return "neutral"

    df["vader_label"] = df["vader_compound"].apply(label_from_compound)
    return df


def mark_canva_and_others(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add helper boolean columns based on the sentence text:
      - mentions_canva
      - mentions_other_tool
    """
    df["sentence_lower"] = df["sentence"].astype(str).str.lower()

    df["mentions_canva"] = df["sentence_lower"].str.contains(r"\bcanva\b", na=False)

    pattern_others = r"\b(" + "|".join(map(re.escape, OTHER_TOOLS)) + r")\b"
    df["mentions_other_tool"] = df["sentence_lower"].str.contains(pattern_others, na=False)

    return df


def mark_professional_context(df: pd.DataFrame) -> pd.DataFrame:
    """
    Mark sentences where professionalism-related adjectives appear,
    and especially where that co-occurs with Canva.
      - professional_keywords
      - canva_prof_context
    """
    pattern_pos = r"|".join(re.escape(w) for w in PROF_POS)
    pattern_neg = r"|".join(re.escape(w) for w in PROF_NEG)
    pattern = r"(" + pattern_pos + r"|" + pattern_neg + r")"

    df["professional_keywords"] = df["sentence_lower"].str.contains(pattern, na=False)
    df["canva_prof_context"] = df["mentions_canva"] & df["professional_keywords"]
    return df


# -----------------------------------------------------------------------------
# SUMMARIES
# -----------------------------------------------------------------------------
def summarize_canva_sentiment(df: pd.DataFrame) -> pd.DataFrame:
    """
    Overall sentiment towards Canva, per interviewee, using sentence-level VADER.

    Uses only sentences:
      - role == 'interviewee'
      - mentions_canva == True
    """
    mask = (df["role"] == "interviewee") & (df["mentions_canva"])
    canva_sent = df[mask].copy()

    if canva_sent.empty:
        print("No interviewee sentences mentioning Canva.")
        return pd.DataFrame()

    # aggregate average compound + count
    summary = (
        canva_sent
        .groupby("interviewee")["vader_compound"]
        .agg(
            n_canva_sentences="count",
            avg_canva_sentiment="mean",
        )
        .reset_index()
    )

    # proportions of pos/neg/neu
    label_counts = (
        canva_sent
        .groupby(["interviewee", "vader_label"])
        .size()
        .unstack(fill_value=0)
    )

    for col in ["positive", "negative", "neutral"]:
        if col not in label_counts.columns:
            label_counts[col] = 0

    label_counts["total"] = label_counts.sum(axis=1)
    label_counts["share_positive"] = label_counts["positive"] / label_counts["total"]
    label_counts["share_negative"] = label_counts["negative"] / label_counts["total"]
    label_counts["share_neutral"] = label_counts["neutral"] / label_counts["total"]

    label_counts = label_counts.reset_index()

    summary = summary.merge(
        label_counts[["interviewee", "share_positive", "share_negative", "share_neutral"]],
        on="interviewee",
        how="left",
    )

    return summary


def summarize_canva_professionalism(df: pd.DataFrame) -> pd.DataFrame:
    """
    Sentiment in Canva+professionalism context, per interviewee.
    Uses sentences:
      - role == 'interviewee'
      - canva_prof_context == True
    """
    mask = (df["role"] == "interviewee") & (df["canva_prof_context"])
    prof_sent = df[mask].copy()

    if prof_sent.empty:
        print("No interviewee sentences about Canva + professionalism.")
        return pd.DataFrame()

    summary = (
        prof_sent
        .groupby("interviewee")["vader_compound"]
        .agg(
            n_prof_sentences="count",
            avg_prof_sentiment="mean",
        )
        .reset_index()
    )

    return summary


def summarize_canva_vs_others(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compare sentiment in three contexts (interviewee sentences only):
      - Canva only
      - Canva + other tools
      - Other tools only (no Canva)
    """
    ans = df[df["role"] == "interviewee"].copy()

    canva_only = ans[(ans["mentions_canva"]) & (~ans["mentions_other_tool"])]
    canva_and_others = ans[(ans["mentions_canva"]) & (ans["mentions_other_tool"])]
    others_only = ans[(~ans["mentions_canva"]) & (ans["mentions_other_tool"])]

    def agg_block(block, label):
        if block.empty:
            return None
        out = (
            block
            .groupby("interviewee")["vader_compound"]
            .agg(
                n_sentences="count",
                avg_sentiment="mean",
            )
            .reset_index()
        )
        out["context"] = label
        return out

    parts = [
        agg_block(canva_only, "Canva only"),
        agg_block(canva_and_others, "Canva + other tools"),
        agg_block(others_only, "Other tools only"),
    ]

    parts = [p for p in parts if p is not None]
    if not parts:
        print("No interviewee sentences about Canva or other tools.")
        return pd.DataFrame()

    return pd.concat(parts, ignore_index=True)


# -----------------------------------------------------------------------------
# MAIN
# -----------------------------------------------------------------------------
def main():
    if not os.path.exists(INPUT_FILE):
        raise FileNotFoundError(f"Could not find {INPUT_FILE}")

    df = pd.read_csv(INPUT_FILE)

    # make sure 'sentence' exists
    if "sentence" not in df.columns:
        raise ValueError("Expected a 'sentence' column in the input file.")

    # 1) add VADER sentiment
    df = add_vader_sentiment(df)

    # 2) mark Canva / other tools / professional context
    df = mark_canva_and_others(df)
    df = mark_professional_context(df)

    # 3) summaries

    print("\n=== Overall Canva Sentiment (sentence-level, VADER) ===")
    summary_canva = summarize_canva_sentiment(df)
    print(summary_canva)

    print("\n=== Canva Professionalism Context Sentiment ===")
    summary_prof = summarize_canva_professionalism(df)
    print(summary_prof)

    print("\n=== Canva vs Other Tools (interviewee sentences) ===")
    summary_vs = summarize_canva_vs_others(df)
    print(summary_vs)

    # optionally save full df with sentiment
    df.to_csv("sentences_with_vader_sentiment.csv", index=False, encoding="utf-8")
    print("\nSaved detailed sentence-level VADER output to sentences_with_vader_sentiment.csv")


if __name__ == "__main__":
    main()

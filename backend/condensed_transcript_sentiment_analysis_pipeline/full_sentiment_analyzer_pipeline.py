#!/usr/bin/env python3

#HIGHLY LABELLED CODE CONDENSED FROM PREVIOUS LEGACY SCRIPTS — MOST FUNCTIONALITY
#EXPLANATIONS ANNOTATED BY AI AND CHECKED BY HUMAN, FOR DOCUMENTATION & FUTURE DEVELOPMENT

"""
End-to-end interview transcript sentiment analysis pipeline.

Stages (all in-memory, no intermediate disk I/O by default):
  00  Parse .docx/.txt transcripts → combined DataFrame
  01  Tag speaker roles (interviewee / interviewer / unknown)
  02  Tokenize each transcript line into individual sentences
  03  HuggingFace RoBERTa sentiment analysis per sentence
  04  Split: Canva-only sentences vs. sentences mentioning other services
  05  Build word-sentiment association stats (Canva sentences only)
  06  Plot word frequency × sentiment scatter (Canva words)
  07  Plot sentiment distribution comparison (Canva vs other services)

Usage:
    python condensed.py                       # runs with defaults below
    python condensed.py --save-intermediate   # also writes intermediate CSVs
"""

import argparse
import os
import re
import glob
import csv
from collections import defaultdict

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
import nltk
from nltk.tokenize import sent_tokenize, word_tokenize
from nltk.corpus import stopwords
from docx import Document
from transformers import pipeline as hf_pipeline


# ===========================================================================
# CONFIG  —  edit these to match your project layout
# ===========================================================================

INPUT_DIR  = "./raw_transcripts"          # folder with .docx / .txt transcripts
OUTPUT_DIR = "./outputs"                  # all plots and (optional) CSVs go here

# HuggingFace model for sentiment analysis
HF_MODEL = "cardiffnlp/twitter-roberta-base-sentiment-latest"

# Non-Canva design tools to separate out
OTHER_SERVICES = [
    "figma", "procreate", "photoshop", "illustrator", "indesign",
    "adobe", "xd", "affinity", "sketch", "powerpoint",
    "google slides", "google docs", "google drive",
    "blender", "fusion360", "davinci resolve", "final cut pro", "nomad sculpt",
]

# Sentiment thresholds  (compound score in [-1, 1])
POS_THRESHOLD =  0.05
NEG_THRESHOLD = -0.05

# Word-stats: drop words appearing fewer than this many times
MIN_WORD_COUNT = 2

# Plot: drop grouped words with total count below this
MIN_GROUP_COUNT = 3

# Plot: how many groups to annotate with labels
TOP_N_LABELS = 18

# Minimum vertical gap between label y-positions to reduce overlap
MIN_Y_GAP = 0.05

# Custom stopwords on top of NLTK English stopwords
CUSTOM_STOPWORDS = {
    "canva", "like", "um", "uh", "yeah", "you", "know",
    "okay", "ok", "sort", "kind", "really", "just",
}

# Word grouping for the scatter plot (singular + plural, synonyms, etc.)
GROUP_DEFS = {
    "template(s)":  ["template", "templates"],
    "flyer(s)":     ["flyer", "flyers"],
    "poster(s)":    ["poster", "posters"],
    "canva-tools":  ["icons", "functionality", "workspace", "tools"],
}

# Optional: override long group names with shorter display labels
LABEL_OVERRIDES = {
    "beginner-friendly": "beginner",
    "canva tools": "tools",
}
MAX_LABEL_LEN = 12  # truncate labels longer than this with "…"

# Words to exclude entirely from the scatter plot
EXCLUDE_WORDS: set[str] = set()


# ===========================================================================
# UTILITIES
# ===========================================================================

def _ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def _nltk_setup() -> None:
    """Download required NLTK data (no-ops if already cached)."""
    for resource in ("punkt", "punkt_tab", "stopwords"):
        nltk.download(resource, quiet=True)


# ===========================================================================
# STAGE 00 — Parse raw transcripts → combined DataFrame
# ===========================================================================

_LINE_PATTERN = re.compile(
    r"""
    ^\s*
    (?:\[(?P<speaker_bracket>[^\]]+)\]\s*)?     # [Speaker]
    (?:(?P<speaker_plain>[A-Za-z .]+)\s*)?      # or Speaker
    (?P<timestamp>\d{1,2}:\d{2}:\d{2})?         # optional 00:00:00
    \s*[:\-]?\s*
    (?P<text>.*\S)?                             # rest of line as text
    \s*$
    """,
    re.VERBOSE,
)


def _parse_line(raw: str):
    """Return (speaker, timestamp, text) from a single raw line."""
    m = _LINE_PATTERN.match(raw.rstrip("\n"))
    if not m:
        return "", "", raw
    speaker   = (m.group("speaker_bracket") or m.group("speaker_plain") or "").strip()
    timestamp = (m.group("timestamp") or "").strip()
    text      = (m.group("text") or "").strip()
    if not speaker and not timestamp and not text:
        return "", "", raw
    return speaker, timestamp, text


def _iter_docx(filepath: str):
    for para in Document(filepath).paragraphs:
        if para.text.strip():
            yield para.text.strip()


def _iter_txt(filepath: str):
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            if line.strip():
                yield line.rstrip("\n")


def stage_00_parse_transcripts(input_dir: str) -> pd.DataFrame:
    """
    Read all .docx/.txt files from input_dir.
    Returns a DataFrame with columns:
        interviewee, line_number, speaker, timestamp, text
    """
    all_rows = []

    for fname in os.listdir(input_dir):
        if fname.startswith("~$"):          # skip Word lock files
            continue
        ext = os.path.splitext(fname)[1].lower()
        if ext not in (".docx", ".txt"):
            continue

        filepath    = os.path.join(input_dir, fname)
        base        = os.path.splitext(fname)[0]
        interviewee = base.replace("_", " ")

        lines = _iter_docx(filepath) if ext == ".docx" else _iter_txt(filepath)
        for i, raw in enumerate(lines, start=1):
            speaker, timestamp, text = _parse_line(raw)
            all_rows.append({
                "interviewee": interviewee,
                "line_number":  i,
                "speaker":      speaker,
                "timestamp":    timestamp,
                "text":         text,
            })

        print(f"  Parsed: {fname}")

    if not all_rows:
        raise RuntimeError(f"No .docx/.txt files found in {input_dir!r}")

    return pd.DataFrame(all_rows)


# ===========================================================================
# STAGE 01 — Tag speaker roles
# ===========================================================================

def stage_01_tag_roles(df: pd.DataFrame) -> pd.DataFrame:
    """Add a 'role' column: interviewee / interviewer / unknown."""
    df = df.copy()
    df["speaker"]     = df["speaker"].fillna("").astype(str).str.strip()
    df["interviewee"] = df["interviewee"].astype(str).str.strip()
    df["text"]        = df["text"].astype(str)

    is_interviewee = df["speaker"].eq(df["interviewee"])
    is_interviewer = (~is_interviewee) & df["speaker"].ne("")

    df["role"] = "unknown"
    df.loc[is_interviewee, "role"] = "interviewee"
    df.loc[is_interviewer, "role"] = "interviewer"

    return df


# ===========================================================================
# STAGE 02 — Sentence tokenization
# ===========================================================================

def stage_02_sentence_level(df: pd.DataFrame) -> pd.DataFrame:
    """
    Explode each transcript line into individual sentences.
    Returns a DataFrame with columns:
        interviewee, role, speaker, line_number, sentence
    """
    _nltk_setup()
    rows = []
    for _, row in df.iterrows():
        for sent in sent_tokenize(str(row.get("text", ""))):
            sent = sent.strip()
            if not sent:
                continue
            rows.append({
                "interviewee": row.get("interviewee", ""),
                "role":        row.get("role", ""),
                "speaker":     row.get("speaker", ""),
                "line_number": row.get("line_number"),
                "sentence":    sent,
            })
    return pd.DataFrame(rows)


# ===========================================================================
# STAGE 03 — HuggingFace sentiment analysis
# ===========================================================================

def stage_03_hf_sentiment(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add columns: hf_label, hf_score, hf_compound.

    hf_compound is a [-1, 1] score calculated as:
        compound = pos_prob - neg_prob
    where for the winning label the winning score is used as that class
    probability, and (1 - score) is assigned to the opposing class.
    Neutral sentences get compound = 0.
    """
    clf = hf_pipeline(
        task="sentiment-analysis",
        model=HF_MODEL,
        tokenizer=HF_MODEL,
        truncation=True,
        max_length=256,
    )

    sentences = df["sentence"].astype(str).tolist()
    hf_labels, hf_scores, hf_compounds = [], [], []

    for text in sentences:
        res   = clf(text)[0]
        label = res["label"].lower()
        score = float(res["score"])

        if label == "positive":
            compound = score - (1.0 - score)      # pos - neg
        elif label == "negative":
            compound = (1.0 - score) - score      # pos - neg
        else:
            compound = 0.0

        hf_labels.append(label)
        hf_scores.append(score)
        hf_compounds.append(compound)

    df = df.copy()
    df["hf_label"]    = hf_labels
    df["hf_score"]    = hf_scores
    df["hf_compound"] = hf_compounds
    return df


# ===========================================================================
# STAGE 04 — Separate Canva-only sentences vs. other-service sentences
# ===========================================================================

def stage_04_separate_services(
    df: pd.DataFrame,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Returns (df_canva_only, df_other_services).
    df_canva_only  — sentences that do NOT mention competing tools
    df_other       — sentences that DO mention competing tools
    """
    pattern = r"\b(" + "|".join(re.escape(w) for w in OTHER_SERVICES) + r")\b"
    mentions_other = df["sentence"].astype(str).str.contains(
        pattern, flags=re.IGNORECASE, na=False
    )
    return df[~mentions_other].copy(), df[mentions_other].copy()


# ===========================================================================
# STAGE 05 — Word-sentiment association stats (Canva sentences)
# ===========================================================================

def _tokenize_clean(text: str, stopwords_all: set) -> set:
    """Return a set of unique cleaned tokens from a sentence."""
    tokens = word_tokenize(text.lower())
    return {
        tok for tok in tokens
        if tok.isalpha() and len(tok) >= 3 and tok not in stopwords_all
    }


def stage_05_canva_word_stats(df: pd.DataFrame) -> pd.DataFrame:
    """
    Build word-level sentiment stats from interviewee sentences that
    mention Canva.  Returns a DataFrame with columns:
        word, count, avg_hf_compound
    """
    _nltk_setup()
    stopwords_all = set(stopwords.words("english")) | CUSTOM_STOPWORDS

    # Filter to interviewee sentences mentioning Canva
    mask_role  = df["role"].astype(str).str.lower().eq("interviewee")
    mask_canva = df["sentence"].str.contains(r"\bcanva\b", flags=re.IGNORECASE, na=False)
    canva_df   = df[mask_role & mask_canva]

    if canva_df.empty:
        print("  Warning: no interviewee sentences mentioning Canva found.")
        return pd.DataFrame(columns=["word", "count", "avg_hf_compound"])

    count: dict[str, int]   = defaultdict(int)
    sum_s: dict[str, float] = defaultdict(float)

    for _, row in canva_df.iterrows():
        words = _tokenize_clean(str(row["sentence"]), stopwords_all)
        score = float(row["hf_compound"])
        for w in words:
            count[w] += 1
            sum_s[w] += score

    rows = [
        {"word": w, "count": c, "avg_hf_compound": sum_s[w] / c}
        for w, c in count.items()
        if c >= MIN_WORD_COUNT
    ]
    word_df = pd.DataFrame(rows).sort_values(
        ["count", "avg_hf_compound"], ascending=[False, False]
    )
    return word_df


# ===========================================================================
# STAGE 06 — Word frequency × sentiment scatter plot
# ===========================================================================

DEFAULT_PLOT_TITLE  = "Word / Word Groups Associated with [Company]: Frequency vs Sentiment"
DEFAULT_PLOT_XLABEL = "Frequency (number of [Company]-related sentences containing word/group)"
DEFAULT_PLOT_YLABEL = "Average sentiment towards [Company] (HF compound)"

def _sentiment_class(score: float) -> str:
    if score >= POS_THRESHOLD:
        return "positive"
    elif score <= NEG_THRESHOLD:
        return "negative"
    return "neutral"


def _format_label(group_name: str) -> str:
    label = LABEL_OVERRIDES.get(group_name, group_name)
    if len(label) > MAX_LABEL_LEN:
        label = label[:MAX_LABEL_LEN - 1] + "…"
    return label


def stage_06_plot_word_sentiment(
    word_df: pd.DataFrame,
    output_dir: str,
    title: str | None = None,
    xlabel: str | None = None,
    ylabel: str | None = None,
) -> None:
    """
    Scatter plot: x = word frequency, y = average sentiment.
    Saves canva_word_freq_sentiment.png to output_dir.
    title/xlabel/ylabel override the default axis labels.
    """
    if word_df.empty:
        print("  Skipping word-sentiment plot (no data).")
        return

    df = word_df.copy()
    df["word"] = df["word"].astype(str)

    # Remove excluded words
    if EXCLUDE_WORDS:
        df = df[~df["word"].str.lower().isin({w.lower() for w in EXCLUDE_WORDS})]

    # Build word→group mapping
    word_to_group = {
        w.lower(): grp
        for grp, words in GROUP_DEFS.items()
        for w in words
    }
    df["group"] = df["word"].apply(lambda w: word_to_group.get(w.lower(), w.lower()))

    # Aggregate by group
    grouped_rows = []
    for grp, sub in df.groupby("group"):
        grouped_rows.append({
            "group":          grp,
            "count":          sub["count"].sum(),
            "avg_hf_compound": np.average(sub["avg_hf_compound"], weights=sub["count"]),
            "original_words": ", ".join(sorted(sub["word"].tolist())),
        })
    gdf = pd.DataFrame(grouped_rows)
    gdf = gdf[gdf["count"] >= MIN_GROUP_COUNT].copy()

    if gdf.empty:
        print(f"  Skipping word-sentiment plot (no groups with count >= {MIN_GROUP_COUNT}).")
        return

    color_map = {"positive": "#2ca02c", "negative": "#d62728", "neutral": "#7f7f7f"}
    gdf["sentiment_class"] = gdf["avg_hf_compound"].apply(_sentiment_class)
    gdf["color"]           = gdf["sentiment_class"].map(color_map)
    gdf["impact_score"]    = gdf["count"] * gdf["avg_hf_compound"].abs()
    gdf_label              = gdf.sort_values("impact_score", ascending=False).head(TOP_N_LABELS)

    plt.figure(figsize=(10, 6))
    plt.scatter(
        gdf["count"], gdf["avg_hf_compound"],
        c=gdf["color"], alpha=0.6, edgecolors="none", s=40,
    )
    plt.axhline(0, color="black", linewidth=0.8, linestyle="--", alpha=0.7)

    # Non-overlapping vertical labels
    label_rows = gdf_label.sort_values("avg_hf_compound").reset_index(drop=True)
    used_y = []
    label_positions = []
    for _, row in label_rows.iterrows():
        x, y_true = float(row["count"]), float(row["avg_hf_compound"])
        y_text = y_true
        while any(abs(y_text - yy) < MIN_Y_GAP for yy in used_y):
            y_text += MIN_Y_GAP
        used_y.append(y_text)
        label_positions.append((x, y_true, y_text, _format_label(row["group"])))

    for x, y_true, y_text, label in label_positions:
        plt.annotate(
            label,
            xy=(x, y_true), xytext=(x, y_text), textcoords="data",
            fontsize=8, alpha=0.9, ha="left", va="center",
            arrowprops=dict(arrowstyle="-", color="gray", lw=0.5, alpha=0.7),
        )

    plt.xlabel(xlabel or DEFAULT_PLOT_XLABEL)
    plt.ylabel(ylabel or DEFAULT_PLOT_YLABEL)
    plt.title(title  or DEFAULT_PLOT_TITLE)
    x_min, x_max = gdf["count"].min(), gdf["count"].max()
    plt.xlim(left=max(0, x_min - 1), right=x_max + 1)
    plt.ylim(-1.05, 1.05)
    plt.grid(alpha=0.2)

    legend_elements = [
        Line2D([0], [0], marker="o", color="w", label="Positive",
               markerfacecolor=color_map["positive"], markersize=8),
        Line2D([0], [0], marker="o", color="w", label="Neutral",
               markerfacecolor=color_map["neutral"],  markersize=8),
        Line2D([0], [0], marker="o", color="w", label="Negative",
               markerfacecolor=color_map["negative"], markersize=8),
    ]
    plt.legend(handles=legend_elements, title="Sentiment", loc="best")
    plt.tight_layout()

    out_path = os.path.join(output_dir, "canva_word_freq_sentiment.png")
    plt.savefig(out_path, dpi=300)
    plt.close()
    print(f"  Saved: {out_path}")


# ===========================================================================
# STAGE 07 — Sentiment distribution comparison (Canva vs other services)
# ===========================================================================

def stage_07_sentiment_comparison(
    df_canva: pd.DataFrame,
    df_other: pd.DataFrame,
    output_dir: str,
) -> None:
    """
    Saves two plots to output_dir:
        sentiment_hist_canva_vs_others.png
        sentiment_box_canva_vs_others.png
    """
    canva_sent = df_canva["hf_compound"].astype(float).dropna()
    other_sent = df_other["hf_compound"].astype(float).dropna()

    # Print summary stats
    print("\n=== Sentiment summary (hf_compound) ===")
    print(pd.DataFrame({
        "Canva-only":      canva_sent.describe(),
        "Other services":  other_sent.describe(),
    }))

    bins = np.linspace(-1.0, 1.0, 21)

    # — Histogram —
    plt.figure(figsize=(8, 5))
    plt.hist(canva_sent, bins=bins, alpha=0.6, label="Canva-only sentences")
    plt.hist(other_sent, bins=bins, alpha=0.6, label="Sentences mentioning other services")
    plt.axvline(0, color="black", linestyle="--", linewidth=0.8)
    plt.xlabel("HF sentiment score (hf_compound)")
    plt.ylabel("Number of sentences")
    plt.title("Sentiment Distribution: Canva-only vs Other Services")
    plt.legend()
    plt.grid(alpha=0.2)
    plt.tight_layout()
    hist_path = os.path.join(output_dir, "sentiment_hist_canva_vs_others.png")
    plt.savefig(hist_path, dpi=300)
    plt.close()
    print(f"  Saved: {hist_path}")

    # — Boxplot —
    plt.figure(figsize=(6, 5))
    plt.boxplot([canva_sent, other_sent], labels=["Canva-only", "Other services"],
                showmeans=True, meanline=True)
    plt.axhline(0, color="black", linestyle="--", linewidth=0.8)
    plt.ylabel("HF sentiment score (hf_compound)")
    plt.title("Sentiment Comparison: Canva-only vs Other Services")
    plt.grid(axis="y", alpha=0.2)
    plt.tight_layout()
    box_path = os.path.join(output_dir, "sentiment_box_canva_vs_others.png")
    plt.savefig(box_path, dpi=300)
    plt.close()
    print(f"  Saved: {box_path}")


# ===========================================================================
# PIPELINE ENTRY POINT
# ===========================================================================

def run_pipeline(
    input_dir: str  = INPUT_DIR,
    output_dir: str = OUTPUT_DIR,
    save_intermediate: bool = False,
) -> dict:
    """
    Run the full pipeline end-to-end.

    Args:
        input_dir:         Folder containing raw .docx / .txt transcripts.
        output_dir:        Folder where plots (and optional CSVs) are written.
        save_intermediate: If True, also write each stage's DataFrame to CSV.

    Returns:
        dict with keys:
            combined_df, sentences_df, sentiment_df,
            df_canva, df_other, word_stats_df
    """
    _ensure_dir(output_dir)
    inter_dir = os.path.join(output_dir, "intermediate")
    if save_intermediate:
        _ensure_dir(inter_dir)

    def _maybe_save(df: pd.DataFrame, name: str) -> None:
        if save_intermediate:
            path = os.path.join(inter_dir, name)
            df.to_csv(path, index=False, encoding="utf-8")
            print(f"  Saved intermediate: {path}")

    # -- Stage 00: parse transcripts --
    print("\n[Stage 00] Parsing transcripts...")
    combined_df = stage_00_parse_transcripts(input_dir)
    print(f"  Rows parsed: {len(combined_df)}")
    _maybe_save(combined_df, "00_combined.csv")

    # -- Stage 01: tag roles --
    print("\n[Stage 01] Tagging speaker roles...")
    combined_df = stage_01_tag_roles(combined_df)
    _maybe_save(combined_df, "01_with_roles.csv")

    # -- Stage 02: sentence tokenization --
    print("\n[Stage 02] Tokenizing into sentences...")
    sentences_df = stage_02_sentence_level(combined_df)
    print(f"  Sentences: {len(sentences_df)}")
    _maybe_save(sentences_df, "02_sentences.csv")

    # -- Stage 03: HF sentiment --
    print("\n[Stage 03] Running HuggingFace sentiment analysis...")
    sentiment_df = stage_03_hf_sentiment(sentences_df)
    _maybe_save(sentiment_df, "03_sentiment.csv")

    # -- Stage 04: separate services --
    print("\n[Stage 04] Separating Canva-only vs other-service sentences...")
    df_canva, df_other = stage_04_separate_services(sentiment_df)
    print(f"  Canva-only: {len(df_canva)} | Other services: {len(df_other)}")
    _maybe_save(df_canva, "04_canva_only.csv")
    _maybe_save(df_other, "04_other_services.csv")

    # -- Stage 05: word-sentiment stats --
    print("\n[Stage 05] Building Canva word-sentiment stats...")
    word_stats_df = stage_05_canva_word_stats(df_canva)
    print(f"  Unique words: {len(word_stats_df)}")
    _maybe_save(word_stats_df, "05_word_stats.csv")

    # -- Stage 06: word-sentiment plot --
    print("\n[Stage 06] Plotting word frequency × sentiment...")
    stage_06_plot_word_sentiment(word_stats_df, output_dir)

    # -- Stage 07: sentiment comparison plots --
    print("\n[Stage 07] Plotting sentiment comparison...")
    stage_07_sentiment_comparison(df_canva, df_other, output_dir)

    print("\nPipeline complete.")
    return {
        "combined_df":   combined_df,
        "sentences_df":  sentences_df,
        "sentiment_df":  sentiment_df,
        "df_canva":      df_canva,
        "df_other":      df_other,
        "word_stats_df": word_stats_df,
    }


# ===========================================================================
# CLI
# ===========================================================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Transcript sentiment analysis pipeline")
    parser.add_argument("--input-dir",  default=INPUT_DIR,  help="Folder with raw transcripts")
    parser.add_argument("--output-dir", default=OUTPUT_DIR, help="Folder for outputs")
    parser.add_argument("--save-intermediate", action="store_true",
                        help="Also save each stage's DataFrame to CSV")
    args = parser.parse_args()

    run_pipeline(
        input_dir=args.input_dir,
        output_dir=args.output_dir,
        save_intermediate=args.save_intermediate,
    )

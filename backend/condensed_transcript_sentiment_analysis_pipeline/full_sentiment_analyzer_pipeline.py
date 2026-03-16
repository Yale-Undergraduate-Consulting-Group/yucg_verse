#!/usr/bin/env python3
#HIGHLY LABELLED CODE CONDENSED FROM PREVIOUS LEGACY SCRIPTS — MOST FUNCTIONALITY
#EXPLANATIONS ANNOTATED BY AI AND CHECKED BY HUMAN, FOR DOCUMENTATION & FUTURE DEVELOPMENT

"""
End-to-end interview transcript sentiment analysis pipeline.

Stages (all in-memory, no intermediate disk I/O by default):
  00  Parse .docx/.txt transcripts → combined DataFrame
  01  Tag speaker roles (interviewee / interviewer / unknown)
  02  Tokenize each transcript line into individual sentences
  03  Sentiment analysis per sentence (via sentiment_model.classify)
  04  Split: target-company sentences vs. sentences mentioning other services
  05  Build word-sentiment association stats (target-company sentences only)
  06  Plot word frequency × sentiment scatter (target-company words)
  07  Plot sentiment distribution comparison (target company vs other services)

Usage:
    python condensed.py                    # runs with defaults below
    python condensed.py --save-intermediate  # also writes intermediate CSVs
"""

import argparse
import os
import re
import sys
from collections import defaultdict
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
import nltk
from nltk.tokenize import sent_tokenize, word_tokenize
from nltk.corpus import stopwords
from docx import Document

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from sentiment_model import classify

# ===========================================================================
# CONFIG — edit these to match your project
# ===========================================================================

INPUT_DIR  = "./raw_transcripts"   # folder with .docx / .txt transcripts
OUTPUT_DIR = "./outputs"           # all plots and (optional) CSVs go here

# ── Target company ──────────────────────────────────────────────────────────
# Set this to the company name being analyzed.
# It is used to filter sentences, build word stats, and label all plots.
# Case-insensitive — "Canva", "canva", and "CANVA" all match the same way.
TARGET_COMPANY = "Canva"

# ── Competing / other services to separate out ──────────────────────────────
# List tools or services that are NOT the target company.
# Stage 04 splits sentences that mention any of these into a separate DataFrame
# so you can compare sentiment toward the target company vs. competitors.
# Update this list to reflect the industry of the company being analyzed.
OTHER_SERVICES = [
    "figma", "procreate", "photoshop", "illustrator", "indesign",
    "adobe", "xd", "affinity", "sketch", "powerpoint",
    "google slides", "google docs", "google drive",
    "blender", "fusion360", "davinci resolve", "final cut pro", "nomad sculpt",
]

# ── Sentiment thresholds ─────────────────────────────────────────────────────
POS_THRESHOLD = 0.05
NEG_THRESHOLD = -0.05

# ── Word-stats config ────────────────────────────────────────────────────────
# Drop words appearing fewer than this many times
MIN_WORD_COUNT = 2

# Plot: drop grouped words with total count below this
MIN_GROUP_COUNT = 3

# Plot: how many groups to annotate with labels
TOP_N_LABELS = 18

# Minimum vertical gap between label y-positions to reduce overlap
MIN_Y_GAP = 0.05

# Custom stopwords added on top of NLTK English stopwords.
# The target company name is added automatically at runtime —
# you do not need to add it here manually.
CUSTOM_STOPWORDS = {
    "like", "um", "uh", "yeah", "you", "know",
    "okay", "ok", "sort", "kind", "really", "just",
}

# ── Word grouping for the scatter plot ───────────────────────────────────────
# Groups singular/plural forms and synonyms into a single data point.
# Update these to reflect vocabulary relevant to the company being analyzed.
# Format: { "display_name": ["word1", "word2", ...] }
GROUP_DEFS = {
    "template(s)":  ["template", "templates"],
    "flyer(s)":     ["flyer", "flyers"],
    "poster(s)":    ["poster", "posters"],
    "tools":        ["icons", "functionality", "workspace", "tools"],
}

# Optional: override long group names with shorter display labels on the plot
LABEL_OVERRIDES = {
    "beginner-friendly": "beginner",
}

MAX_LABEL_LEN = 12   # truncate labels longer than this with "…"

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


def _company_slug(company: str) -> str:
    """Return a lowercase, filesystem-safe version of the company name."""
    return re.sub(r"[^a-z0-9]+", "_", company.lower()).strip("_")


# ===========================================================================
# STAGE 00 — Parse raw transcripts → combined DataFrame
# ===========================================================================

_LINE_PATTERN = re.compile(
    r"""
    ^\s*
    (?:\[(?P<speaker_bracket>[^\]]+)\]\s*)?   # [Speaker]
    (?:(?P<speaker_plain>[A-Za-z .]+)\s*)?    # or Speaker
    (?P<timestamp>\d{1,2}:\d{2}:\d{2})?       # optional 00:00:00
    \s*[:\-]?\s*
    (?P<text>.*\S)?                            # rest of line as text
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
        if fname.startswith("~$"):   # skip Word lock files
            continue
        ext = os.path.splitext(fname)[1].lower()
        if ext not in (".docx", ".txt"):
            continue
        filepath   = os.path.join(input_dir, fname)
        base       = os.path.splitext(fname)[0]
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
# STAGE 03 — Sentiment analysis
# ===========================================================================

def stage_03_hf_sentiment(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add columns: hf_label, hf_score, hf_compound.

    hf_compound is a [-1, 1] score:
      positive label → compound = +score
      negative label → compound = -score
      neutral        → compound = 0
    """
    sentences = df["sentence"].astype(str).tolist()
    hf_labels, hf_scores, hf_compounds = [], [], []
    for text in sentences:
        result = classify(text)
        hf_labels.append(result["label"])
        hf_scores.append(result["score"])
        hf_compounds.append(result["compound"])
    df = df.copy()
    df["hf_label"]    = hf_labels
    df["hf_score"]    = hf_scores
    df["hf_compound"] = hf_compounds
    return df


# ===========================================================================
# STAGE 04 — Separate target-company sentences vs. other-service sentences
# ===========================================================================

def stage_04_separate_services(
    df: pd.DataFrame,
    target_company: str = TARGET_COMPANY,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Splits the sentence DataFrame into two groups:

    df_target — sentences that mention the target company but NOT
                any of the competing services in OTHER_SERVICES.
                These represent pure sentiment toward the target company.

    df_other  — sentences that mention at least one competing service.
                Used for comparison in stage_07.

    Args:
        df:             Sentence-level DataFrame with a 'sentence' column.
        target_company: The company name to filter on (default: TARGET_COMPANY).

    Returns:
        (df_target, df_other)
    """
    # Build pattern for competing services
    other_pattern = r"\b(" + "|".join(re.escape(w) for w in OTHER_SERVICES) + r")\b"
    mentions_other = df["sentence"].astype(str).str.contains(
        other_pattern, flags=re.IGNORECASE, na=False
    )

    # Build pattern for the target company
    target_pattern = r"\b" + re.escape(target_company) + r"\b"
    mentions_target = df["sentence"].astype(str).str.contains(
        target_pattern, flags=re.IGNORECASE, na=False
    )

    # Target-only: mentions the company but not any competitor
    df_target = df[mentions_target & ~mentions_other].copy()

    # Other: mentions at least one competitor
    df_other = df[mentions_other].copy()

    return df_target, df_other


# ===========================================================================
# STAGE 05 — Word-sentiment association stats (target-company sentences)
# ===========================================================================

def _tokenize_clean(text: str, stopwords_all: set) -> set:
    """Return a set of unique cleaned tokens from a sentence."""
    tokens = word_tokenize(text.lower())
    return {
        tok for tok in tokens
        if tok.isalpha() and len(tok) >= 3 and tok not in stopwords_all
    }


def stage_05_word_stats(
    df: pd.DataFrame,
    target_company: str = TARGET_COMPANY,
) -> pd.DataFrame:
    """
    Build word-level sentiment stats from interviewee sentences that
    mention the target company.

    The company name itself is added to stopwords automatically so it
    doesn't appear as a data point in the scatter plot.

    Args:
        df:             Sentence-level DataFrame (typically df_target from stage_04).
        target_company: Company name — added to stopwords automatically.

    Returns:
        DataFrame with columns: word, count, avg_hf_compound
    """
    _nltk_setup()

    # Add the company name to stopwords so it doesn't pollute the word stats
    stopwords_all = (
        set(stopwords.words("english"))
        | CUSTOM_STOPWORDS
        | {target_company.lower()}
    )

    # Filter to interviewee sentences that mention the target company
    mask_role    = df["role"].astype(str).str.lower().eq("interviewee")
    target_pattern = r"\b" + re.escape(target_company) + r"\b"
    mask_target  = df["sentence"].str.contains(
        target_pattern, flags=re.IGNORECASE, na=False
    )
    target_df = df[mask_role & mask_target]

    if target_df.empty:
        print(f"  Warning: no interviewee sentences mentioning '{target_company}' found.")
        return pd.DataFrame(columns=["word", "count", "avg_hf_compound"])

    count:  dict[str, int]   = defaultdict(int)
    sum_s:  dict[str, float] = defaultdict(float)

    for _, row in target_df.iterrows():
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


# Keep the old name as an alias so existing callers (e.g. main.py) don't break
stage_05_canva_word_stats = stage_05_word_stats


# ===========================================================================
# STAGE 06 — Word frequency × sentiment scatter plot
# ===========================================================================

DEFAULT_PLOT_TITLE  = "Word / Word Groups Associated with {company}: Frequency vs Sentiment"
DEFAULT_PLOT_XLABEL = "Frequency (number of {company}-related sentences containing word/group)"
DEFAULT_PLOT_YLABEL = "Average sentiment towards {company} (compound score)"


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
    target_company: str = TARGET_COMPANY,
    title:  str | None = None,
    xlabel: str | None = None,
    ylabel: str | None = None,
) -> None:
    """
    Scatter plot: x = word frequency, y = average sentiment.

    Output filename is derived from the target company name so running
    the pipeline for different companies never overwrites previous results.
    E.g. for "Canva" → canva_word_freq_sentiment.png
         for "Figma" → figma_word_freq_sentiment.png

    Args:
        word_df:        Output of stage_05_word_stats.
        output_dir:     Folder to write the PNG into.
        target_company: Used to fill in default title/axis labels and filename.
        title/xlabel/ylabel: Override the auto-generated axis labels if provided.
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
            "group":           grp,
            "count":           sub["count"].sum(),
            "avg_hf_compound": np.average(sub["avg_hf_compound"], weights=sub["count"]),
            "original_words":  ", ".join(sorted(sub["word"].tolist())),
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
    gdf_label = gdf.sort_values("impact_score", ascending=False).head(TOP_N_LABELS)

    # Resolve axis labels — use provided overrides or auto-generate from company name
    resolved_title  = title  or DEFAULT_PLOT_TITLE.format(company=target_company)
    resolved_xlabel = xlabel or DEFAULT_PLOT_XLABEL.format(company=target_company)
    resolved_ylabel = ylabel or DEFAULT_PLOT_YLABEL.format(company=target_company)

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
            xy=(x, y_true), xytext=(x, y_text),
            textcoords="data", fontsize=8, alpha=0.9, ha="left", va="center",
            arrowprops=dict(arrowstyle="-", color="gray", lw=0.5, alpha=0.7),
        )

    plt.xlabel(resolved_xlabel)
    plt.ylabel(resolved_ylabel)
    plt.title(resolved_title)
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

    # Output filename derived from company name — never overwrites other companies
    slug     = _company_slug(target_company)
    out_path = os.path.join(output_dir, f"{slug}_word_freq_sentiment.png")
    plt.savefig(out_path, dpi=300)
    plt.close()
    print(f"  Saved: {out_path}")


# ===========================================================================
# STAGE 07 — Sentiment distribution comparison (target company vs others)
# ===========================================================================

def stage_07_sentiment_comparison(
    df_target: pd.DataFrame,
    df_other:  pd.DataFrame,
    output_dir: str,
    target_company: str = TARGET_COMPANY,
) -> None:
    """
    Saves two comparison plots to output_dir:
        {slug}_sentiment_hist.png   — histogram of compound score distributions
        {slug}_sentiment_box.png    — boxplot comparison

    Args:
        df_target:      Sentences mentioning the target company (from stage_04).
        df_other:       Sentences mentioning competing services (from stage_04).
        output_dir:     Folder to write PNGs into.
        target_company: Used for axis labels and output filenames.
    """
    target_sent = df_target["hf_compound"].astype(float).dropna()
    other_sent  = df_other["hf_compound"].astype(float).dropna()

    # Print summary stats
    print(f"\n=== Sentiment summary — {target_company} vs other services ===")
    print(pd.DataFrame({
        f"{target_company}-only": target_sent.describe(),
        "Other services":          other_sent.describe(),
    }))

    slug = _company_slug(target_company)
    bins = np.linspace(-1.0, 1.0, 21)

    # — Histogram —
    plt.figure(figsize=(8, 5))
    plt.hist(target_sent, bins=bins, alpha=0.6, label=f"{target_company}-only sentences")
    plt.hist(other_sent,  bins=bins, alpha=0.6, label="Sentences mentioning other services")
    plt.axvline(0, color="black", linestyle="--", linewidth=0.8)
    plt.xlabel("Sentiment score (compound)")
    plt.ylabel("Number of sentences")
    plt.title(f"Sentiment Distribution: {target_company} vs Other Services")
    plt.legend()
    plt.grid(alpha=0.2)
    plt.tight_layout()
    hist_path = os.path.join(output_dir, f"{slug}_sentiment_hist.png")
    plt.savefig(hist_path, dpi=300)
    plt.close()
    print(f"  Saved: {hist_path}")

    # — Boxplot —
    plt.figure(figsize=(6, 5))
    plt.boxplot(
        [target_sent, other_sent],
        labels=[f"{target_company}-only", "Other services"],
        showmeans=True, meanline=True,
    )
    plt.axhline(0, color="black", linestyle="--", linewidth=0.8)
    plt.ylabel("Sentiment score (compound)")
    plt.title(f"Sentiment Comparison: {target_company} vs Other Services")
    plt.grid(axis="y", alpha=0.2)
    plt.tight_layout()
    box_path = os.path.join(output_dir, f"{slug}_sentiment_box.png")
    plt.savefig(box_path, dpi=300)
    plt.close()
    print(f"  Saved: {box_path}")


# ===========================================================================
# PIPELINE ENTRY POINT
# ===========================================================================

def run_pipeline(
    input_dir:        str  = INPUT_DIR,
    output_dir:       str  = OUTPUT_DIR,
    target_company:   str  = TARGET_COMPANY,
    save_intermediate: bool = False,
) -> dict:
    """
    Run the full pipeline end-to-end.

    Args:
        input_dir:        Folder containing raw .docx / .txt transcripts.
        output_dir:       Folder where plots (and optional CSVs) are written.
        target_company:   The company being analyzed. Overrides the module-level
                          TARGET_COMPANY constant when called programmatically.
        save_intermediate: If True, also write each stage's DataFrame to CSV.

    Returns:
        dict with keys:
            combined_df, sentences_df, sentiment_df,
            df_target, df_other, word_stats_df
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

    # -- Stage 03: sentiment analysis --
    print("\n[Stage 03] Running sentiment analysis...")
    sentiment_df = stage_03_hf_sentiment(sentences_df)
    _maybe_save(sentiment_df, "03_sentiment.csv")

    # -- Stage 04: separate target company vs other services --
    print(f"\n[Stage 04] Separating '{target_company}' sentences vs other-service sentences...")
    df_target, df_other = stage_04_separate_services(sentiment_df, target_company)
    print(f"  {target_company}-only: {len(df_target)} | Other services: {len(df_other)}")
    _maybe_save(df_target, "04_target_only.csv")
    _maybe_save(df_other,  "04_other_services.csv")

    # -- Stage 05: word-sentiment stats --
    print(f"\n[Stage 05] Building '{target_company}' word-sentiment stats...")
    word_stats_df = stage_05_word_stats(df_target, target_company)
    print(f"  Unique words: {len(word_stats_df)}")
    _maybe_save(word_stats_df, "05_word_stats.csv")

    # -- Stage 06: word-sentiment plot --
    print("\n[Stage 06] Plotting word frequency × sentiment...")
    stage_06_plot_word_sentiment(word_stats_df, output_dir, target_company)

    # -- Stage 07: sentiment comparison plots --
    print("\n[Stage 07] Plotting sentiment comparison...")
    stage_07_sentiment_comparison(df_target, df_other, output_dir, target_company)

    print("\nPipeline complete.")
    return {
        "combined_df":   combined_df,
        "sentences_df":  sentences_df,
        "sentiment_df":  sentiment_df,
        "df_target":     df_target,
        "df_other":      df_other,
        "word_stats_df": word_stats_df,
    }


# ===========================================================================
# CLI
# ===========================================================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Transcript sentiment analysis pipeline")
    parser.add_argument("--input-dir",       default=INPUT_DIR,       help="Folder with raw transcripts")
    parser.add_argument("--output-dir",      default=OUTPUT_DIR,      help="Folder for outputs")
    parser.add_argument("--company",         default=TARGET_COMPANY,  help="Target company name (e.g. 'Figma')")
    parser.add_argument("--save-intermediate", action="store_true",   help="Also save each stage's DataFrame to CSV")
    args = parser.parse_args()

    run_pipeline(
        input_dir         = args.input_dir,
        output_dir        = args.output_dir,
        target_company    = args.company,
        save_intermediate = args.save_intermediate,
    )
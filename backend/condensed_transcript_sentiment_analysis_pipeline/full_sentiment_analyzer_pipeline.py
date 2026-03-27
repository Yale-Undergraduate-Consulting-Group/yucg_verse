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
  04  Split: target-company sentences vs. sentences mentioning competitor services
  05  Build word-sentiment association stats (target-company sentences only)
  06  Plot word frequency × sentiment scatter (target-company words)
  07  Plot sentiment distribution comparison (target company vs competitors)

Usage:
    python condensed.py --company "Figma"
    python condensed.py --company "Figma" --other-services "adobe,sketch,xd"
    python condensed.py --company "Figma" --save-intermediate
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
# CONFIG — module-level defaults used only when running from the CLI
#          without arguments. In normal API usage these are always overridden
#          by values passed in from the frontend.
# ===========================================================================

INPUT_DIR  = "./raw_transcripts"   # folder with .docx / .txt transcripts
OUTPUT_DIR = "./outputs"           # all plots and (optional) CSVs go here

# ── Target company fallback ──────────────────────────────────────────────────
# Only used when running the CLI without --company.
# In API usage the frontend always supplies the company name explicitly.
# "Company" is intentionally generic — it signals no real company was assumed.
TARGET_COMPANY = "Company"

# ── Competitor services fallback ─────────────────────────────────────────────
# Only used when running the CLI without --other-services.
# In API usage the user supplies their own list via the frontend input field.
#
# Stage 04 uses this list to separate sentences that mention competitors
# from sentences that mention only the target company. This separation serves
# two purposes:
#   1. Purity filter for the word-stats scatter plot (stages 05/06) — sentences
#      that compare the target company to a competitor are excluded so the word
#      associations reflect pure sentiment about the target company only.
#   2. Comparison chart in stage 07 — shows how sentiment when discussing the
#      target company differs from sentiment when discussing competitors.
DEFAULT_OTHER_SERVICES = [
    "figma", "procreate", "photoshop", "illustrator", "indesign",
    "adobe", "xd", "affinity", "sketch", "powerpoint",
    "google slides", "google docs", "google drive",
    "blender", "fusion360", "davinci resolve", "final cut pro", "nomad sculpt",
]

# ── Sentiment thresholds ─────────────────────────────────────────────────────
POS_THRESHOLD = 0.05
NEG_THRESHOLD = -0.05

# ── Word-stats config ────────────────────────────────────────────────────────
MIN_WORD_COUNT  = 2    # drop words appearing fewer than this many times
MIN_GROUP_COUNT = 3    # drop grouped words with total count below this
TOP_N_LABELS    = 18   # how many groups to annotate with labels on the plot
MIN_Y_GAP       = 0.05 # minimum vertical gap between label y-positions

# ── Custom stopwords ─────────────────────────────────────────────────────────
# Added on top of NLTK English stopwords.
# The target company name is added automatically at runtime in stage_05 —
# you do not need to list it here manually.
CUSTOM_STOPWORDS = {
    "like", "um", "uh", "yeah", "you", "know",
    "okay", "ok", "sort", "kind", "really", "just",
}

# ── Word grouping for the scatter plot ───────────────────────────────────────
# Groups singular/plural forms and synonyms into a single data point.
# Update these to reflect vocabulary relevant to the company being analyzed.
# Format: { "display_name": ["word1", "word2", ...] }
GROUP_DEFS = {
    "template(s)": ["template", "templates"],
    "flyer(s)":    ["flyer", "flyers"],
    "poster(s)":   ["poster", "posters"],
    "tools":       ["icons", "functionality", "workspace", "tools"],
}

# Optional: override long group names with shorter display labels on the plot
LABEL_OVERRIDES = {
    "beginner-friendly": "beginner",
}

MAX_LABEL_LEN = 12    # truncate labels longer than this with "…"

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

# Skip lines that are pure metadata, never actual speech.
# WEBVTT timestamp:  "00:01:42.000 --> 00:01:45.000"
_WEBVTT_TS_RE     = re.compile(r"^\s*\d{2}:\d{2}:\d{2}\.\d+\s*-->\s*\d{2}:\d{2}:\d{2}\.\d+\s*$")
# Range timestamp:  "(0:00 - 0:06)"
_RANGE_TS_RE      = re.compile(r"^\s*\(\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}\)\s*$")
# Speaker label — colon is REQUIRED so plain prose is never mistaken for a name.
# Matches:  "Liu Frank: text"   "[Speaker] text"
_SPEAKER_COLON_RE = re.compile(r"^([A-Za-z][A-Za-z .]{0,50}?):\s*(.+)$")
_SPEAKER_BRACKET_RE = re.compile(r"^\[([^\]]+)\]\s*[:\-]?\s*(.*)$")


def _parse_line(raw: str):
    """
    Return (speaker, timestamp, text) from a single raw transcript line.

    Handles three common export formats:
      - Plain "Speaker Name: sentence" (PDF transcripts, Google Docs exports)
      - WEBVTT  ("WEBVTT" header + "HH:MM:SS.mmm --> HH:MM:SS.mmm" + "Speaker: text")
      - No-label ("(H:MM - H:MM)" range timestamps + plain text paragraphs)

    The key fix over the old regex: speaker_plain now requires a colon after
    the name, so a sentence like "My name is David." is never split into
    speaker="My name is David" / text="" by accident.
    """
    stripped = raw.rstrip("\n").strip()

    # Blank lines, WEBVTT header, and timestamp-only lines carry no speech.
    if not stripped or stripped.upper() == "WEBVTT":
        return "", "", ""
    if _WEBVTT_TS_RE.match(stripped) or _RANGE_TS_RE.match(stripped):
        return "", "", ""

    # "[Speaker] text" format
    m = _SPEAKER_BRACKET_RE.match(stripped)
    if m:
        return m.group(1).strip(), "", m.group(2).strip()

    # "Speaker Name: text" format  (colon required)
    m = _SPEAKER_COLON_RE.match(stripped)
    if m:
        return m.group(1).strip(), "", m.group(2).strip()

    # No speaker label — treat the whole line as text (David_Ortiz style)
    return "", "", stripped


def _iter_docx(filepath: str):
    for para in Document(filepath).paragraphs:
        if para.text.strip():
            yield para.text.strip()


def _iter_txt(filepath: str):
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            if line.strip():
                yield line.rstrip("\n")


def _iter_pdf(filepath: str):
    """Extract lines from a PDF transcript using pdfplumber."""
    import pdfplumber
    with pdfplumber.open(filepath) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            for line in text.splitlines():
                if line.strip():
                    yield line.strip()


def stage_00_parse_transcripts(input_dir: str) -> pd.DataFrame:
    """
    Read all .docx/.txt files from input_dir.
    Returns a DataFrame with columns:
        interviewee, line_number, speaker, timestamp, text
    """
    all_rows = []
    for fname in os.listdir(input_dir):
        if fname.startswith("~$"):
            continue
        ext = os.path.splitext(fname)[1].lower()
        if ext not in (".docx", ".txt", ".pdf"):
            continue
        filepath    = os.path.join(input_dir, fname)
        base        = os.path.splitext(fname)[0]
        interviewee = base.replace("_", " ")
        if ext == ".docx":
            lines = _iter_docx(filepath)
        elif ext == ".pdf":
            lines = _iter_pdf(filepath)
        else:
            lines = _iter_txt(filepath)
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
    """
    Add a 'role' column: interviewee / interviewer / unknown.

    Strategy (per file):
      1. Exact match — if any speaker label equals the filename-derived name,
         use that as the interviewee. Works for Jane.pdf ("Jane" == "Jane").
      2. Most-lines heuristic — if no exact match (e.g. filename "Ezra_Skrylix"
         vs transcript label "Ezra Skerlecz"), the speaker with the most lines
         in that file is tagged as the interviewee.
      3. No labels — if no speaker labels exist at all (David_Ortiz style),
         everyone stays "unknown" and stage_05 falls back to all sentences.
    """
    df = df.copy()
    df["speaker"]     = df["speaker"].fillna("").astype(str).str.strip()
    df["interviewee"] = df["interviewee"].astype(str).str.strip()
    df["text"]        = df["text"].astype(str)
    df["role"]        = "unknown"

    for interviewee_name, file_df in df.groupby("interviewee"):
        labeled = file_df[file_df["speaker"].ne("")]

        if labeled.empty:
            # No speaker labels at all — leave everyone as "unknown"
            continue

        # Strategy 1: exact filename match
        exact = labeled[labeled["speaker"].eq(interviewee_name)]
        if not exact.empty:
            top_speaker = interviewee_name
        else:
            # Strategy 2: speaker with the most labeled lines
            top_speaker = labeled["speaker"].value_counts().idxmax()

        is_top = file_df["speaker"].eq(top_speaker)
        df.loc[file_df[is_top].index, "role"] = "interviewee"
        df.loc[file_df[~is_top & file_df["speaker"].ne("")].index, "role"] = "interviewer"

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
    Add sentiment columns to each sentence row.

    Calls classify() from sentiment_model, which routes to whichever
    backend is active (OpenAI or Railway) depending on SENTIMENT_BACKEND.

    Columns added:
        hf_label    — "positive" | "negative" | "neutral"
        hf_score    — confidence in that label (0.0–1.0)
        hf_compound — overall intensity: positive → +score,
                      negative → -score, neutral → 0
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
# STAGE 04 — Separate target-company sentences vs. competitor sentences
# ===========================================================================

def stage_04_separate_services(
    df: pd.DataFrame,
    target_company: str            = TARGET_COMPANY,
    other_services: list[str] | None = None,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Splits the sentence DataFrame into two groups:

    df_target — sentences that mention the target company but NOT any
                competitor from other_services. These represent pure
                sentiment about the target company, uncontaminated by
                direct competitor comparisons.

    df_other  — sentences that mention at least one competitor service.
                Used in stage_07 to compare sentiment distributions.
                Empty if other_services is None or [] — stage_07 handles
                this gracefully by skipping the comparison chart.

    Args:
        df:             Sentence-level DataFrame with a 'sentence' column.
        target_company: Name of the company being analyzed. Supplied by the
                        user via the frontend Target Company input field.
        other_services: List of competitor/other service names entered by the
                        user via the frontend Competitor Services input field.
                        Falls back to DEFAULT_OTHER_SERVICES when running from
                        the CLI without --other-services.

    Returns:
        (df_target, df_other)
    """
    # Use provided list or fall back to the module-level CLI default
    services = other_services if other_services else DEFAULT_OTHER_SERVICES

    # Build regex pattern for the target company
    target_pattern  = r"\b" + re.escape(target_company) + r"\b"
    mentions_target = df["sentence"].astype(str).str.contains(
        target_pattern, flags=re.IGNORECASE, na=False
    )

    if services:
        # Build regex pattern for all competitor services
        other_pattern  = r"\b(" + "|".join(re.escape(w) for w in services) + r")\b"
        mentions_other = df["sentence"].astype(str).str.contains(
            other_pattern, flags=re.IGNORECASE, na=False
        )
    else:
        # No competitors specified — all target mentions are treated as pure,
        # df_other will be empty and stage_07 will skip the comparison chart
        mentions_other = pd.Series(False, index=df.index)

    df_target = df[mentions_target & ~mentions_other].copy()
    df_other  = df[mentions_other].copy()

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

    The company name is automatically added to stopwords so it does not
    appear as its own data point in the scatter plot — the goal is to
    understand which other words co-occur with the company and how they
    correlate with sentiment.

    Args:
        df:             Sentence-level DataFrame. Pass df_target from
                        stage_04 so only pure target-company sentences
                        are analyzed.
        target_company: Company name — added to stopwords automatically.

    Returns:
        DataFrame with columns: word, count, avg_hf_compound
    """
    _nltk_setup()

    stopwords_all = (
        set(stopwords.words("english"))
        | CUSTOM_STOPWORDS
        | {target_company.lower()}
    )

    mask_role   = df["role"].astype(str).str.lower().eq("interviewee")
    target_pat  = r"\b" + re.escape(target_company) + r"\b"
    mask_target = df["sentence"].str.contains(
        target_pat, flags=re.IGNORECASE, na=False
    )
    target_df = df[mask_role & mask_target]

    if target_df.empty:
        # No interviewee-tagged sentences — either role tagging couldn't identify
        # the interviewee (no speaker labels) or the name filter found nothing.
        # Fall back to ALL sentences mentioning the target company.
        print(f"  Warning: no interviewee sentences mentioning '{target_company}' found. Falling back to all speakers.")
        target_df = df[mask_target]

    if target_df.empty:
        print(f"  Warning: no sentences mentioning '{target_company}' found at all.")
        return pd.DataFrame(columns=["word", "count", "avg_hf_compound"])

    count: dict[str, int]   = defaultdict(int)
    sum_s: dict[str, float] = defaultdict(float)

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


# Alias so existing callers in main.py continue to work without changes
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
    Scatter plot: x = word/group frequency, y = average sentiment compound score.

    Each point represents a word or word group that co-occurs with the target
    company in interviewee sentences. Color encodes sentiment class.

    Output filename is derived from the company name so analyses for different
    companies never overwrite each other:
        "Canva" → canva_word_freq_sentiment.png
        "Figma" → figma_word_freq_sentiment.png

    Args:
        word_df:        Output of stage_05_word_stats.
        output_dir:     Folder to write the PNG into.
        target_company: Used to auto-generate axis labels and the filename.
        title/xlabel/ylabel: Override the auto-generated labels if provided
                             (used by the frontend "Update labels" button).
    """
    if word_df.empty:
        print("  Skipping word-sentiment plot (no data).")
        return

    df = word_df.copy()
    df["word"] = df["word"].astype(str)

    if EXCLUDE_WORDS:
        df = df[~df["word"].str.lower().isin({w.lower() for w in EXCLUDE_WORDS})]

    word_to_group = {
        w.lower(): grp
        for grp, words in GROUP_DEFS.items()
        for w in words
    }
    df["group"] = df["word"].apply(lambda w: word_to_group.get(w.lower(), w.lower()))

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

    resolved_title  = title  or DEFAULT_PLOT_TITLE.format(company=target_company)
    resolved_xlabel = xlabel or DEFAULT_PLOT_XLABEL.format(company=target_company)
    resolved_ylabel = ylabel or DEFAULT_PLOT_YLABEL.format(company=target_company)

    plt.figure(figsize=(10, 6))
    plt.scatter(
        gdf["count"], gdf["avg_hf_compound"],
        c=gdf["color"], alpha=0.6, edgecolors="none", s=40,
    )
    plt.axhline(0, color="black", linewidth=0.8, linestyle="--", alpha=0.7)

    label_rows = gdf_label.sort_values("avg_hf_compound").reset_index(drop=True)
    used_y, label_positions = [], []
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

    slug     = _company_slug(target_company)
    out_path = os.path.join(output_dir, f"{slug}_word_freq_sentiment.png")
    plt.savefig(out_path, dpi=300)
    plt.close()
    print(f"  Saved: {out_path}")


# ===========================================================================
# STAGE 07 — Sentiment distribution comparison (target vs competitors)
# ===========================================================================

def stage_07_sentiment_comparison(
    df_target: pd.DataFrame,
    df_other:  pd.DataFrame,
    output_dir: str,
    target_company: str = TARGET_COMPANY,
) -> None:
    """
    Saves two comparison plots to output_dir:
        {slug}_sentiment_hist.png  — histogram of compound score distributions
        {slug}_sentiment_box.png   — boxplot comparison

    Skips gracefully if df_other is empty, which happens when the user did
    not enter any competitor services or none of the transcript sentences
    matched the competitor list. In that case the comparison chart is simply
    omitted from the output without raising an error.

    Args:
        df_target:      Sentences about the target company (from stage_04).
        df_other:       Sentences mentioning competitors (from stage_04).
        output_dir:     Folder to write PNGs into.
        target_company: Used for axis labels and output filenames.
    """
    target_sent = df_target["hf_compound"].astype(float).dropna()
    other_sent  = df_other["hf_compound"].astype(float).dropna()

    if other_sent.empty:
        print("  Skipping comparison chart — no competitor sentences found.")
        return

    print(f"\n=== Sentiment summary — {target_company} vs competitors ===")
    print(pd.DataFrame({
        f"{target_company}-only": target_sent.describe(),
        "Competitors":            other_sent.describe(),
    }))

    slug = _company_slug(target_company)
    bins = np.linspace(-1.0, 1.0, 21)

    plt.figure(figsize=(8, 5))
    plt.hist(target_sent, bins=bins, alpha=0.6, label=f"{target_company}-only sentences")
    plt.hist(other_sent,  bins=bins, alpha=0.6, label="Competitor-related sentences")
    plt.axvline(0, color="black", linestyle="--", linewidth=0.8)
    plt.xlabel("Sentiment score (compound)")
    plt.ylabel("Number of sentences")
    plt.title(f"Sentiment Distribution: {target_company} vs Competitors")
    plt.legend()
    plt.grid(alpha=0.2)
    plt.tight_layout()
    hist_path = os.path.join(output_dir, f"{slug}_sentiment_hist.png")
    plt.savefig(hist_path, dpi=300)
    plt.close()
    print(f"  Saved: {hist_path}")

    plt.figure(figsize=(6, 5))
    plt.boxplot(
        [target_sent, other_sent],
        labels=[f"{target_company}-only", "Competitors"],
        showmeans=True, meanline=True,
    )
    plt.axhline(0, color="black", linestyle="--", linewidth=0.8)
    plt.ylabel("Sentiment score (compound)")
    plt.title(f"Sentiment Comparison: {target_company} vs Competitors")
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
    input_dir:         str              = INPUT_DIR,
    output_dir:        str              = OUTPUT_DIR,
    target_company:    str              = TARGET_COMPANY,
    other_services:    list[str] | None = None,
    save_intermediate: bool             = False,
) -> dict:
    """
    Run the full pipeline end-to-end.

    Args:
        input_dir:        Folder containing raw .docx / .txt transcripts.
        output_dir:       Folder where plots (and optional CSVs) are written.
        target_company:   The company being analyzed. Always provided explicitly
                          in API usage; falls back to TARGET_COMPANY in CLI usage.
        other_services:   List of competitor service names used in stage_04 to
                          separate competitor sentences from target-company
                          sentences. Provided by the user via the frontend
                          Competitor Services input field. Falls back to
                          DEFAULT_OTHER_SERVICES when running the CLI without
                          --other-services. Pass an empty list [] to skip
                          competitor separation entirely.
        save_intermediate: If True, write each stage's DataFrame to CSV.

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

    print("\n[Stage 00] Parsing transcripts...")
    combined_df = stage_00_parse_transcripts(input_dir)
    print(f"  Rows parsed: {len(combined_df)}")
    _maybe_save(combined_df, "00_combined.csv")

    print("\n[Stage 01] Tagging speaker roles...")
    combined_df = stage_01_tag_roles(combined_df)
    _maybe_save(combined_df, "01_with_roles.csv")

    print("\n[Stage 02] Tokenizing into sentences...")
    sentences_df = stage_02_sentence_level(combined_df)
    print(f"  Sentences: {len(sentences_df)}")
    _maybe_save(sentences_df, "02_sentences.csv")

    print("\n[Stage 03] Running sentiment analysis...")
    sentiment_df = stage_03_hf_sentiment(sentences_df)
    _maybe_save(sentiment_df, "03_sentiment.csv")

    print(f"\n[Stage 04] Separating '{target_company}' sentences vs competitor sentences...")
    df_target, df_other = stage_04_separate_services(
        sentiment_df, target_company, other_services
    )
    print(f"  {target_company}-only: {len(df_target)} | Competitors: {len(df_other)}")
    _maybe_save(df_target, "04_target_only.csv")
    _maybe_save(df_other,  "04_other_services.csv")

    print(f"\n[Stage 05] Building '{target_company}' word-sentiment stats...")
    word_stats_df = stage_05_word_stats(df_target, target_company)
    print(f"  Unique words: {len(word_stats_df)}")
    _maybe_save(word_stats_df, "05_word_stats.csv")

    print("\n[Stage 06] Plotting word frequency × sentiment...")
    stage_06_plot_word_sentiment(word_stats_df, output_dir, target_company)

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
    parser.add_argument("--input-dir",    default=INPUT_DIR,      help="Folder with raw transcripts")
    parser.add_argument("--output-dir",   default=OUTPUT_DIR,     help="Folder for outputs")
    parser.add_argument("--company",      default=TARGET_COMPANY, help="Target company name, e.g. 'Figma'")
    parser.add_argument(
        "--other-services",
        default=None,
        help=(
            "Comma-separated list of competitor services to separate out, "
            "e.g. 'adobe,sketch,xd'. Omit to use the built-in default list."
        ),
    )
    parser.add_argument("--save-intermediate", action="store_true",
                        help="Also save each stage's DataFrame to CSV")
    args = parser.parse_args()

    parsed_other = (
        [s.strip() for s in args.other_services.split(",") if s.strip()]
        if args.other_services
        else None
    )

    run_pipeline(
        input_dir         = args.input_dir,
        output_dir        = args.output_dir,
        target_company    = args.company,
        other_services    = parsed_other,
        save_intermediate = args.save_intermediate,
    )
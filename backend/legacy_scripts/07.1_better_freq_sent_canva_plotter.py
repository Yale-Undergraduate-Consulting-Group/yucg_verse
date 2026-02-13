#!/usr/bin/env python3

"""
Visualize Canva-associated words as Frequency x Sentiment,
with:
  - hard-coded list of words to EXCLUDE
  - ability to GROUP similar words into one data point
  - de-overlapped labels by vertically staggering them with arrows.

Input:
    canva_word_sentiment_stats.csv
    Expected columns:
        - word
        - count
        - avg_hf_compound   ([-1,1], HF-based sentiment)

Output:
    canva_word_freq_sentiment.png   # scatter plot of grouped words
"""

import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.lines import Line2D

# -------------------------------------------------------------------
# CONFIG
# -------------------------------------------------------------------
INPUT_FILE = "canva_word_sentiment_stats.csv"
OUTPUT_FIG = "canva_word_freq_sentiment.png"

# Minimum total frequency (after grouping) to keep a point
MIN_COUNT = 3

# How many group labels to annotate on the plot
TOP_N_LABELS = 18

POS_THRESHOLD = 0.05   # sentiment > this ⇒ positive
NEG_THRESHOLD = -0.05  # sentiment < this ⇒ negative

# Minimum vertical distance between label y-positions to reduce overlap
MIN_Y_GAP = 0.05

# -------------------------------------------------------------------
# WORDS TO EXCLUDE
# -------------------------------------------------------------------
EXCLUDE_WORDS = {
    
}
EXCLUDE_WORDS = {w.lower() for w in EXCLUDE_WORDS}

# -------------------------------------------------------------------
# GROUP DEFINITIONS
# -------------------------------------------------------------------
GROUP_DEFS = {
    "template(s)": ["template", "templates"],
    "flyer(s)": ["flyer", "flyers"],
    "poster(s)": ["poster", "posters"],
    "canva-tools": ["icons", "functionality", "workspace", "tools"],
}
WORD_TO_GROUP = {
    w.lower(): group_label
    for group_label, words in GROUP_DEFS.items()
    for w in words
}

# -------------------------------------------------------------------
# LABEL SHORTENING CONFIG
# -------------------------------------------------------------------
# Map long group names to nicer short labels (optional)
LABEL_OVERRIDES = {
    "beginner-friendly": "beginner",
    "canva tools": "tools",
    # add more overrides if you want specific short names
}

# Maximum label length before truncating with "…"
MAX_LABEL_LEN = 12


def format_label(group_name: str) -> str:
    """
    Produce a short, readable label from the group name:
      1) use LABEL_OVERRIDES if present
      2) otherwise, truncate long names to MAX_LABEL_LEN with "…"
      3) (optional) could insert line breaks on spaces if needed
    """
    label = LABEL_OVERRIDES.get(group_name, group_name)

    # Optional: break multi-word labels onto two lines
    # if len(label) > MAX_LABEL_LEN and " " in label:
    #     label = label.replace(" ", "\n", 1)

    if len(label) > MAX_LABEL_LEN:
        label = label[:MAX_LABEL_LEN - 1] + "…"

    return label


# -------------------------------------------------------------------
# HELPERS
# -------------------------------------------------------------------
def sentiment_class(score: float) -> str:
    """Classify sentiment into positive / neutral / negative."""
    if score >= POS_THRESHOLD:
        return "positive"
    elif score <= NEG_THRESHOLD:
        return "negative"
    else:
        return "neutral"


def main():
    # 1) Load word-level stats
    df = pd.read_csv(INPUT_FILE)

    for col in ["word", "count", "avg_hf_compound"]:
        if col not in df.columns:
            raise ValueError(f"Expected column '{col}' in {INPUT_FILE}")

    df["word"] = df["word"].astype(str)

    # 2) Exclude specific words (before grouping)
    if EXCLUDE_WORDS:
        df = df[~df["word"].str.lower().isin(EXCLUDE_WORDS)].copy()

    if df.empty:
        print("All words were excluded; nothing to plot.")
        return

    # 3) Assign group labels
    def get_group_label(word: str) -> str:
        w_l = word.lower()
        return WORD_TO_GROUP.get(w_l, w_l)  # default: the word itself (lowercased)

    df["group"] = df["word"].apply(get_group_label)

    # 4) Aggregate by group:
    grouped_rows = []
    for group_label, sub in df.groupby("group"):
        total_count = sub["count"].sum()
        avg_sent = np.average(sub["avg_hf_compound"], weights=sub["count"])
        original_words = ", ".join(sorted(set(sub["word"].tolist())))

        grouped_rows.append(
            {
                "group": group_label,
                "count": total_count,
                "avg_hf_compound": avg_sent,
                "original_words": original_words,
            }
        )

    gdf = pd.DataFrame(grouped_rows)

    # 5) Filter by total count (after grouping)
    gdf = gdf[gdf["count"] >= MIN_COUNT].copy()
    if gdf.empty:
        print(f"No groups with count >= {MIN_COUNT}. Nothing to plot.")
        return

    # 6) Sentiment class and colors
    gdf["sentiment_class"] = gdf["avg_hf_compound"].apply(sentiment_class)

    color_map = {
        "positive": "#2ca02c",  # green
        "negative": "#d62728",  # red
        "neutral":  "#7f7f7f",  # gray
    }
    gdf["color"] = gdf["sentiment_class"].map(color_map)

    # 7) Choose which groups to label on the plot
    gdf["impact_score"] = gdf["count"] * gdf["avg_hf_compound"].abs()
    gdf_label = gdf.sort_values("impact_score", ascending=False).head(TOP_N_LABELS)

    # 8) Make the scatter plot
    plt.figure(figsize=(10, 6))

    plt.scatter(
        gdf["count"],
        gdf["avg_hf_compound"],
        c=gdf["color"],
        alpha=0.6,
        edgecolors="none",
        s=40,
    )

    # Horizontal line at 0 sentiment
    plt.axhline(0, color="black", linewidth=0.8, linestyle="--", alpha=0.7)

    # 9) Compute non-overlapping label positions (vertical staggering)
    label_rows = gdf_label.sort_values("avg_hf_compound").reset_index(drop=True)

    used_y = []          # adjusted y positions we've already assigned
    label_positions = [] # (x, y_true, y_text, label)

    for _, row in label_rows.iterrows():
        x = float(row["count"])
        y_true = float(row["avg_hf_compound"])
        group_name = row["group"]
        label = format_label(group_name)

        # start from the true y
        y_text = y_true

        # bump y_text up in steps of MIN_Y_GAP until it's far enough from existing labels
        while any(abs(y_text - yy) < MIN_Y_GAP for yy in used_y):
            y_text += MIN_Y_GAP

        used_y.append(y_text)
        label_positions.append((x, y_true, y_text, label))

    # 10) Draw labels with arrows from text to the real point
    for x, y_true, y_text, label in label_positions:
        plt.annotate(
            label,
            xy=(x, y_true),        # point
            xytext=(x, y_text),    # label position
            textcoords="data",
            fontsize=8,
            alpha=0.9,
            ha="left",
            va="center",
            arrowprops=dict(
                arrowstyle="-",
                color="gray",
                lw=0.5,
                alpha=0.7,
            ),
        )

    # 11) Axes labels and styling
    plt.xlabel("Frequency (number of Canva-related sentences containing word/group)")
    plt.ylabel("Average sentiment towards Canva (HF compound)")
    plt.title("Word / Word Groups Associated with Canva: Frequency vs Sentiment")

    x_min, x_max = gdf["count"].min(), gdf["count"].max()
    plt.xlim(left=max(0, x_min - 1), right=x_max + 1)
    plt.ylim(-1.05, 1.05)
    plt.grid(alpha=0.2)

    # Legend
    legend_elements = [
        Line2D([0], [0], marker="o", color="w", label="Positive",
               markerfacecolor=color_map["positive"], markersize=8),
        Line2D([0], [0], marker="o", color="w", label="Neutral",
               markerfacecolor=color_map["neutral"], markersize=8),
        Line2D([0], [0], marker="o", color="w", label="Negative",
               markerfacecolor=color_map["negative"], markersize=8),
    ]
    plt.legend(handles=legend_elements, title="Sentiment", loc="best")

    plt.tight_layout()
    plt.savefig(OUTPUT_FIG, dpi=300)
    print(f"Saved plot to: {OUTPUT_FIG}")
    print("Top grouped points (for debug):")
    print(gdf_label[["group", "count", "avg_hf_compound", "original_words"]])


if __name__ == "__main__":
    main()

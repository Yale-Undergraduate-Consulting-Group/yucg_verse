#!/usr/bin/env python3

"""
Visualize Canva-associated words as Frequency x Sentiment,
with:
  - hard-coded list of words to EXCLUDE
  - ability to GROUP similar words into one data point.

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

# -------------------------------------------------------------------
# CONFIG
# -------------------------------------------------------------------
INPUT_FILE = "canva_word_sentiment_stats.csv"
OUTPUT_FIG = "0_canva_word_freq_sentiment.png"

# Minimum total frequency (after grouping) to keep a point
MIN_COUNT = 3

# How many group labels to annotate on the plot
TOP_N_LABELS = 10

POS_THRESHOLD = 0.05   # sentiment > this ⇒ positive
NEG_THRESHOLD = -0.05  # sentiment < this ⇒ negative

# -------------------------------------------------------------------
# WORDS TO EXCLUDE (edit this)
# -------------------------------------------------------------------
EXCLUDE_WORDS = {
  
}
EXCLUDE_WORDS = {w.lower() for w in EXCLUDE_WORDS}

# -------------------------------------------------------------------
# GROUP DEFINITIONS 
#
# Format:
#   GROUP_DEFS = {
#       "template(s)": ["template", "templates"],
#       "professional": ["professional", "professionally", "professionals"],
#       "beginner-friendly": ["beginner", "beginners", "beginner-friendly"],
#       ...
#   }
#
# Any word listed in the values gets grouped under the group key.
# Words not listed in GROUP_DEFS stay as their own group (themselves).
# -------------------------------------------------------------------
GROUP_DEFS = {
    "template(s)": ["template", "templates"],
    "flyer(s)": ["flyer", "flyers"],
    "poster(s)": ["poster", "posters"],
    "professional": ["professional", "professionally", "professionals"],
    "beginner-friendly": ["beginner", "beginners", "beginner-friendly"],
    "easy": ["easy", "ease", "easier", "easiest"],
    "cute": ["cute", "cutesy"],
    "canva tools": ["icons", "functionality", "workspace", "tools"]
}

WORD_TO_GROUP = {
    w.lower(): group_label
    for group_label, words in GROUP_DEFS.items()
    for w in words
}


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

    # basic sanity checks
    for col in ["word", "count", "avg_hf_compound"]:
        if col not in df.columns:
            raise ValueError(f"Expected column '{col}' in {INPUT_FILE}")

    # Normalize word column to str
    df["word"] = df["word"].astype(str)

    # 2) Exclude specific words (before grouping)
    if EXCLUDE_WORDS:
        df = df[~df["word"].str.lower().isin(EXCLUDE_WORDS)].copy()

    if df.empty:
        print("All words were excluded; nothing to plot.")
        return

    # 3) Assign group labels
    #    If word is in WORD_TO_GROUP, use that group label;
    #    otherwise, group = the word itself.
    def get_group_label(word: str) -> str:
        w_l = word.lower()
        return WORD_TO_GROUP.get(w_l, w_l)  # use lowercased word as default group name

    df["group"] = df["word"].apply(get_group_label)

    # 4) Aggregate by group:
    #    - total count = sum of counts
    #    - avg_hf_compound = weighted average by count
    grouped_rows = []
    for group_label, sub in df.groupby("group"):
        total_count = sub["count"].sum()

        # weighted average sentiment by count
        avg_sent = np.average(sub["avg_hf_compound"], weights=sub["count"])

        # optional: track which original words are in this group
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
    # Score by count * |sentiment| for "impact"
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

    # Annotate top-impact groups
    for _, row in gdf_label.iterrows():
        x = row["count"]
        y = row["avg_hf_compound"]
        label = row["group"]
        plt.annotate(
            label,
            (x, y),
            textcoords="offset points",
            xytext=(4, 4),
            fontsize=8,
            alpha=0.9,
        )

    # Axes labels and styling
    plt.xlabel("Frequency (number of Canva sentences containing group)")
    plt.ylabel("Average sentiment towards Canva (HF compound)")
    plt.title("Word Groups Associated with Canva: Frequency vs Sentiment")

    x_min, x_max = gdf["count"].min(), gdf["count"].max()
    plt.xlim(left=max(0, x_min - 1), right=x_max + 1)
    plt.ylim(-1.05, 1.05)
    plt.grid(alpha=0.2)

    # Legend
    from matplotlib.lines import Line2D
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

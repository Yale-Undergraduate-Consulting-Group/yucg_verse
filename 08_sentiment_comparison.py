#!/usr/bin/env python3

"""
Compare sentiment distributions for:
  - sentences about Canva only
  - sentences mentioning other services

Inputs:
    sentences_no_other_services.csv   # Canva-only sentences + HF sentiment
    sentences_other_services.csv      # sentences mentioning other tools + HF sentiment

Assumes both have a column:
    - hf_compound   (float in [-1, 1])

Outputs:
    - Canva vs Other: overlaid histogram
    - Canva vs Other: side-by-side boxplot
"""

import pandas as pd
import matplotlib.pyplot as plt
import numpy as np

# -------------------------------------------------------------------
# CONFIG
# -------------------------------------------------------------------
CANVA_FILE = "sentences_no_other_services.csv"
OTHER_FILE = "sentences_other_services.csv"

SENT_COL = "hf_compound"  # sentiment score column name

HIST_FIG = "sentiment_hist_canva_vs_others.png"
BOX_FIG  = "sentiment_box_canva_vs_others.png"


def load_sentiments(path: str, label: str) -> pd.Series:
    """Load a CSV and return the sentiment series."""
    df = pd.read_csv(path)
    if SENT_COL not in df.columns:
        raise ValueError(f"Expected column '{SENT_COL}' in {path}")
    s = df[SENT_COL].astype(float).dropna()
    if s.empty:
        print(f"Warning: no sentiment values found in {path} for {label}.")
    return s


def main():
    # 1) Load data
    canva_sent = load_sentiments(CANVA_FILE, "Canva-only")
    other_sent = load_sentiments(OTHER_FILE, "Other services")

    # 2) Basic stats
    print("=== Sentiment summary (HF compound) ===")
    summary_df = pd.DataFrame(
        {
            "Canva-only": canva_sent.describe(),
            "Other services": other_sent.describe(),
        }
    )
    print(summary_df)

    # 3) Overlaid histogram
    plt.figure(figsize=(8, 5))

    bins = np.linspace(-1.0, 1.0, 21)  # 20 bins from -1 to 1

    plt.hist(
        canva_sent,
        bins=bins,
        alpha=0.6,
        label="Canva-only sentences",
        density=False,
    )
    plt.hist(
        other_sent,
        bins=bins,
        alpha=0.6,
        label="Sentences mentioning other services",
        density=False,
    )

    plt.axvline(0, color="black", linestyle="--", linewidth=0.8)

    plt.xlabel("HF sentiment score (hf_compound)")
    plt.ylabel("Number of sentences")
    plt.title("Sentiment Distribution: Canva-only vs Other Services")
    plt.legend()
    plt.grid(alpha=0.2)

    plt.tight_layout()
    plt.savefig(HIST_FIG, dpi=300)
    print(f"Saved histogram to: {HIST_FIG}")

    # 4) Boxplot comparison
    plt.figure(figsize=(6, 5))

    plt.boxplot(
        [canva_sent, other_sent],
        labels=["Canva-only", "Other services"],
        showmeans=True,
        meanline=True,
    )

    plt.axhline(0, color="black", linestyle="--", linewidth=0.8)

    plt.ylabel("HF sentiment score (hf_compound)")
    plt.title("Sentiment Comparison: Canva-only vs Other Services")
    plt.grid(axis="y", alpha=0.2)

    plt.tight_layout()
    plt.savefig(BOX_FIG, dpi=300)
    print(f"Saved boxplot to: {BOX_FIG}")


if __name__ == "__main__":
    main()

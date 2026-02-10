#!/usr/bin/env python3

"""
Split sentence-level HF sentiment file into:
  1) sentences that mention non-Canva design services
  2) all remaining sentences

Input:
    sentences_with_hf_sentiment.csv
    (assumed to have at least a 'sentence' column)

Outputs:
    sentences_other_services.csv      # sentences mentioning other tools
    sentences_no_other_services.csv   # all remaining sentences
"""

import re
import pandas as pd

# ---- CONFIG --------------------------------------------------------

INPUT_FILE = "sentences_with_hf_sentiment.csv"

OUTPUT_OTHER = "sentences_other_services.csv"
OUTPUT_REST = "sentences_no_other_services.csv"

# List of *non-Canva* design tools / services to look for
OTHER_SERVICES = [
    "figma",
    "procreate",
    "photoshop",
    "illustrator",
    "indesign",
    "adobe",
    "xd",
    "affinity",
    "sketch",
    "powerpoint",
    "google slides",
    "word"
    "google docs"
    "google drive"
    "blender"
    "procreate",
    "fusion360",
    "davinci resolve",
    "final cut pro",
    "nomad sculpt"
]

# ---- MAIN ----------------------------------------------------------

def main():
    # 1) Load the HF sentiment file
    df = pd.read_csv(INPUT_FILE)

    # Make sure we have a text column
    if "sentence" not in df.columns:
        raise ValueError("Expected a 'sentence' column in the input file.")

    # 2) Build a regex to detect any of the other services (case-insensitive, whole words)
    pattern = r"\b(" + "|".join(re.escape(w) for w in OTHER_SERVICES) + r")\b"

    # Boolean flag: does this sentence mention any other design service?
    df["mentions_other_service"] = df["sentence"].astype(str).str.contains(
        pattern, flags=re.IGNORECASE, na=False
    )

    # 3) Split into two dataframes
    df_other = df[df["mentions_other_service"]].copy()
    df_rest = df[~df["mentions_other_service"]].copy()

    # 4) Save them
    df_other.to_csv(OUTPUT_OTHER, index=False, encoding="utf-8")
    df_rest.to_csv(OUTPUT_REST, index=False, encoding="utf-8")

    print(f"Total sentences: {len(df)}")
    print(f"Sentences mentioning other services: {len(df_other)}  -> {OUTPUT_OTHER}")
    print(f"Remaining sentences: {len(df_rest)}                  -> {OUTPUT_REST}")


if __name__ == "__main__":
    main()

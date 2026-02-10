#!/usr/bin/env python3

import os
import glob
import pandas as pd

# Folder where your individual transcript CSVs live
DATA_DIR = "./processed_csv_transcripts"   # change if needed

# Output filenames
OUTPUT_CSV = "all_transcripts_combined.csv"
OUTPUT_XLSX = "all_transcripts_combined.xlsx"


def load_all_transcripts(data_dir: str) -> pd.DataFrame:
    """
    Load all .csv files from `data_dir` into a single DataFrame
    and add an 'interviewee' column derived from the file name.

    Example:
    - 'Erin_Yoon.csv' → interviewee = 'Erin Yoon'
    """
    all_rows = []

    # Find all CSV files in the directory
    for path in glob.glob(os.path.join(data_dir, "*.csv")):
        fname = os.path.basename(path)        # e.g. "Erin_Yoon.csv"
        base, _ = os.path.splitext(fname)     # e.g. "Erin_Yoon"
        interviewee = base.replace("_", " ")  # e.g. "Erin Yoon"

        df = pd.read_csv(path)
        df["interviewee"] = interviewee       # tag each row with interviewee name
        all_rows.append(df)

    if not all_rows:
        raise RuntimeError(f"No CSV files found in {data_dir}")

    # Concatenate into one big DataFrame
    combined = pd.concat(all_rows, ignore_index=True)
    return combined


if __name__ == "__main__":
    # 1) Load and combine all transcripts
    combined_df = load_all_transcripts(DATA_DIR)

    # 2) Export to a single combined CSV
    combined_df.to_csv(OUTPUT_CSV, index=False, encoding="utf-8")

    # 3) Export to Excel (nice for reading / sharing)
    combined_df.to_excel(OUTPUT_XLSX, index=False)

    print(f"Combined shape: {combined_df.shape}")
    print(f"Saved CSV  : {os.path.abspath(OUTPUT_CSV)}")
    print(f"Saved Excel: {os.path.abspath(OUTPUT_XLSX)}")
    print("\nPreview:")
    print(combined_df.head())

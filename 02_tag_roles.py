#!/usr/bin/env python3

import pandas as pd

INPUT_FILE = "all_transcripts_combined.csv"
OUTPUT_FILE = "all_transcripts_with_roles.csv"


def main():
    df = pd.read_csv(INPUT_FILE)

    # Clean basic fields
    df["speaker"] = df["speaker"].fillna("").astype(str).str.strip()
    df["interviewee"] = df["interviewee"].astype(str).str.strip()
    df["text"] = df["text"].astype(str)

    # Tag interviewee vs interviewer
    df["is_interviewee"] = df["speaker"].eq(df["interviewee"])
    df["is_interviewer"] = (~df["is_interviewee"]) & df["speaker"].ne("")

    def determine_role(row):
        if row["is_interviewee"]:
            return "interviewee"
        elif row["is_interviewer"]:
            return "interviewer"
        else:
            return "unknown"

    df["role"] = df.apply(determine_role, axis=1)

    df.to_csv(OUTPUT_FILE, index=False, encoding="utf-8")
    print(f"Saved: {OUTPUT_FILE}")
    print(df.head())


if __name__ == "__main__":
    main()

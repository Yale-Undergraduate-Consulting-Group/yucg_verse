#!/usr/bin/env python3

import pandas as pd
import nltk
from nltk.tokenize import sent_tokenize

INPUT_FILE = "all_transcripts_with_roles.csv"
OUTPUT_FILE = "sentences_transcripts.csv"


def main():
    # Make sure both punkt and punkt_tab are available
    nltk.download("punkt", quiet=True)
    nltk.download("punkt_tab", quiet=True)

    df = pd.read_csv(INPUT_FILE)

    rows = []
    for _, row in df.iterrows():
        interviewee = str(row.get("interviewee", ""))
        role = str(row.get("role", ""))
        speaker = str(row.get("speaker", ""))
        line_num = row.get("line_number", None)
        text = str(row.get("text", ""))

        # Split into sentences
        for sent in sent_tokenize(text):
            sent = sent.strip()
            if not sent:
                continue
            rows.append(
                {
                    "interviewee": interviewee,
                    "role": role,
                    "speaker": speaker,
                    "line_number": line_num,
                    "sentence": sent,
                }
            )

    sent_df = pd.DataFrame(rows)
    sent_df.to_csv(OUTPUT_FILE, index=False, encoding="utf-8")
    print(f"Saved sentence-level file: {OUTPUT_FILE}")
    print(sent_df.head(10))


if __name__ == "__main__":
    main()

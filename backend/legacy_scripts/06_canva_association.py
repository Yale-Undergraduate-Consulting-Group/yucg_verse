#!/usr/bin/env python3

"""
Find words and sentiments most commonly associated with Canva.

Input:
    sentences_with_hf_sentiment.csv
    Expected columns:
      - sentence       (str)
      - hf_compound    (float, [-1,1], HF-based sentiment per sentence)
      - role           (str, e.g. 'interviewee'/'interviewer')
      - (optional) interviewee, speaker, etc.

Output:
    canva_word_sentiment_stats.csv

Each row = one word, with:
    - count              (# of Canva sentences that word appears in)
    - avg_hf_compound    (mean sentiment of those sentences)
"""

import re
import pandas as pd
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize

INPUT_FILE = "sentences_no_other_services.csv"
OUTPUT_FILE = "canva_word_sentiment_stats.csv"

# -------------------------------------------------------------------
# NLTK setup
# -------------------------------------------------------------------
# First time, this will download; afterwards it's cached.
nltk.download("punkt", quiet=True)
nltk.download("stopwords", quiet=True)

EN_STOPWORDS = set(stopwords.words("english"))

# Add your own filler / domain stopwords
CUSTOM_STOPWORDS = {
    "canva", "like", "um", "uh", "yeah", "you", "know",
    "okay", "ok", "sort", "kind", "really", "just",
}
STOPWORDS_ALL = EN_STOPWORDS | CUSTOM_STOPWORDS


def tokenize_clean(text: str):
    """
    Lowercase, tokenize, and filter tokens:
      - alphabetic only
      - length >= 3
      - not in stopwords
    Returns a set of words (unique per sentence) so one sentence
    doesn't overcount a repeated word.
    """
    text = text.lower()
    tokens = word_tokenize(text)

    words = []
    for tok in tokens:
        # keep alphabetic tokens only (no pure numbers/punctuation)
        if not tok.isalpha():
            continue
        if len(tok) < 3:
            continue
        if tok in STOPWORDS_ALL:
            continue
        words.append(tok)

    # use set so each word counts once per sentence
    return set(words)


def main():
    # 1) Load HF sentiment file
    df = pd.read_csv(INPUT_FILE)

    if "sentence" not in df.columns:
        raise ValueError("Expected a 'sentence' column in the input file.")
    if "hf_compound" not in df.columns:
        raise ValueError("Expected a 'hf_compound' column (HF sentiment) in the input file.")

    # 2) Filter to interviewee sentences mentioning Canva
    #    (adjust if your 'role' column uses different labels)
    df["sentence"] = df["sentence"].astype(str)

    # role == 'interviewee'
    if "role" in df.columns:
        mask_role = df["role"].astype(str).str.lower().eq("interviewee")
    else:
        # if role column missing, don't filter by role
        mask_role = True

    # sentence contains 'canva' (case-insensitive)
    mask_canva = df["sentence"].str.contains(r"\bcanva\b", flags=re.IGNORECASE, na=False)

    canva_df = df[mask_role & mask_canva].copy()

    if canva_df.empty:
        print("No interviewee sentences mentioning Canva found.")
        return

    # 3) Tokenize sentences and build word stats
    # We'll track:
    #   - count[word] = how many sentences the word appears in
    #   - sum_sent[word] = sum of hf_compound for those sentences
    from collections import defaultdict

    count = defaultdict(int)
    sum_sent = defaultdict(float)

    for _, row in canva_df.iterrows():
        sent = str(row["sentence"])
        sent_score = float(row["hf_compound"])

        words = tokenize_clean(sent)

        for w in words:
            count[w] += 1
            sum_sent[w] += sent_score

    # 4) Build a DataFrame of word-level stats
    rows = []
    for w, c in count.items():
        avg = sum_sent[w] / c if c > 0 else 0.0
        rows.append(
            {
                "word": w,
                "count": c,
                "avg_hf_compound": avg,
            }
        )

    word_df = pd.DataFrame(rows)

    # Optional: filter out words that appear only once to reduce noise
    word_df = word_df[word_df["count"] >= 2].copy()

    # Sort by frequency first, then sentiment
    word_df = word_df.sort_values(
        by=["count", "avg_hf_compound"], ascending=[False, False]
    )

    # 5) Save to CSV
    word_df.to_csv(OUTPUT_FILE, index=False, encoding="utf-8")
    print(f"Saved Canva word sentiment stats to: {OUTPUT_FILE}")
    print(word_df.head(30))


if __name__ == "__main__":
    main()

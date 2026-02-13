#!/usr/bin/env python3

import pandas as pd
from transformers import pipeline

INPUT_FILE = "sentences_transcripts.csv"
OUTPUT_FILE = "sentences_with_hf_sentiment.csv"

# We'll use a 3-class English sentiment model: negative / neutral / positive
MODEL_NAME = "cardiffnlp/twitter-roberta-base-sentiment-latest"


def main():
    # 1) Load the sentence-level dataframe
    df = pd.read_csv(INPUT_FILE)

    # 2) Create a HuggingFace sentiment pipeline
    clf = pipeline(
        task="sentiment-analysis",
        model=MODEL_NAME,
        tokenizer=MODEL_NAME,
        truncation=True,
        max_length=256,
    )

    sentences = df["sentence"].astype(str).tolist()

    hf_labels = []
    hf_scores = []
    hf_compounds = []

    # 3) Loop through sentences and get sentiment
    for text in sentences:
        # clf(text) returns e.g. [{'label': 'positive', 'score': 0.98}]
        res = clf(text)[0]
        label = res["label"].lower()   # 'positive', 'neutral', 'negative'
        score = float(res["score"])    # confidence for that label

        
        
        # Here is how we calculate hf_compound, the overall assigned "sentiment score/value"
        
        # Method 1: Sentiment score is just +1 (pos)/ 0(neutral)/-1 (neg) multiplied by the probability score
        # if label == "positive":
        #     pos = score
        # elif label == "negative":
        #     neg = -1.0 * score
        # else:  # 'neutral'
        #     pos = 0.0
        #     neg = 0.0
            
        # Method 2: Rough mapping to [-1,1]: pos - neg
        # For this model, labels are exactly 'positive', 'neutral', 'negative'     
        if label == "positive":
            pos = score
            neg = 1.0 - score
        elif label == "negative":
            neg = score
            pos = 1.0 - score
        else:  # 'neutral'
            pos = 0.0
            neg = 0.0

        #this is the hf_compound/sentiment value output nob
        compound = pos - neg

        hf_labels.append(label)
        hf_scores.append(score)
        hf_compounds.append(compound)

    # 4) Attach results to dataframe
    df["hf_label"] = hf_labels         # 'positive' / 'neutral' / 'negative'
    df["hf_score"] = hf_scores         # model confidence in its predicted class
    df["hf_compound"] = hf_compounds   # crude [-1,1] sentiment score

    # 5) Save to CSV
    df.to_csv(OUTPUT_FILE, index=False, encoding="utf-8")
    print(f"Saved HF sentiment file: {OUTPUT_FILE}")
    print(df.head(10))


if __name__ == "__main__":
    main()

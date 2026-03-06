"""
Sentiment classification via TextBlob.

TextBlob's PatternAnalyzer uses a lightweight pattern-based lexicon (~1 MB).
Small NLTK corpora (punkt, averaged_perceptron_tagger) are downloaded
automatically on first startup if not already present (~3 MB total, one-time).

Future: swap in the HuggingFace Inference API via _hf_classify() below
once a HUGGINGFACE_API_KEY is configured on the server.
"""

import nltk
from textblob import TextBlob

nltk.download("punkt", quiet=True)
nltk.download("punkt_tab", quiet=True)
nltk.download("averaged_perceptron_tagger_eng", quiet=True)


def classify(text: str) -> dict:
    """
    Classify sentiment of a single text string.

    Returns:
        {
            "label":    "positive" | "negative" | "neutral",
            "score":    float,   # confidence proxy (0–1)
            "compound": float,   # [-1, 1]; TextBlob polarity mapped directly
        }
    """
    if not text or not text.strip():
        return {"label": "neutral", "score": 0.0, "compound": 0.0}

    polarity = TextBlob(text).sentiment.polarity  # [-1, 1]

    if polarity > 0.05:
        label = "positive"
        score = (polarity + 1.0) / 2.0
    elif polarity < -0.05:
        label = "negative"
        score = (1.0 - polarity) / 2.0
    else:
        label = "neutral"
        score = 1.0 - abs(polarity) / 0.05 * 0.5

    return {"label": label, "score": round(score, 4), "compound": round(polarity, 4)}


# ── HuggingFace Inference API (future) ────────────────────────────────────────
# Swap classify() to call this once HUGGINGFACE_API_KEY is set on the server.
#
# import os, requests
# _HF_API_URL = (
#     "https://api-inference.huggingface.co/models/"
#     "distilbert-base-uncased-finetuned-sst-2-english"
# )
# _HF_HEADERS = {"Authorization": f"Bearer {os.environ.get('HUGGINGFACE_API_KEY', '')}"}
#
# def _hf_classify(text: str) -> dict:
#     payload = {"inputs": text[:1800]}
#     response = requests.post(_HF_API_URL, headers=_HF_HEADERS, json=payload, timeout=10)
#     response.raise_for_status()
#     data = response.json()
#     candidates = data[0] if isinstance(data[0], list) else data
#     best = max(candidates, key=lambda x: x["score"])
#     label = best["label"].lower()
#     score = float(best["score"])
#     if label == "positive":
#         compound = score - (1.0 - score)
#     elif label == "negative":
#         compound = (1.0 - score) - score
#     else:
#         compound = 0.0
#     return {"label": label, "score": score, "compound": compound}
# ─────────────────────────────────────────────────────────────────────────────

"""
Sentiment classification.

Reads SENTIMENT_BACKEND from the environment (default: "openai").
  - "openai"  → OpenAI Chat Completions (requires OPENAI_API_KEY)
  - anything else → TextBlob fallback (no API key needed)
"""

import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

_BACKEND = os.getenv("SENTIMENT_BACKEND", "openai").lower()
_OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")


def _openai_classify(text: str) -> dict:
    from openai import OpenAI

    client = OpenAI(api_key=_OPENAI_API_KEY)

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a sentiment classifier. "
                    "Classify the sentiment of the given text as exactly one of: "
                    "positive, negative, or neutral. "
                    "Also provide a compound score between -1.0 (most negative) and 1.0 (most positive). "
                    "Respond with JSON only, in this exact format: "
                    '{"label": "positive"|"negative"|"neutral", "compound": <float>}'
                ),
            },
            {"role": "user", "content": text[:1800]},
        ],
        temperature=0,
        response_format={"type": "json_object"},
    )

    import json
    data = json.loads(response.choices[0].message.content)
    label = str(data.get("label", "neutral")).lower()
    compound = float(data.get("compound", 0.0))
    compound = max(-1.0, min(1.0, compound))

    if label == "positive":
        score = (compound + 1.0) / 2.0
    elif label == "negative":
        score = (1.0 - compound) / 2.0
    else:
        score = 1.0 - abs(compound) * 0.5

    return {"label": label, "score": round(score, 4), "compound": round(compound, 4)}


def _textblob_classify(text: str) -> dict:
    import nltk
    nltk.download("punkt", quiet=True)
    nltk.download("punkt_tab", quiet=True)
    nltk.download("averaged_perceptron_tagger_eng", quiet=True)

    from textblob import TextBlob
    polarity = TextBlob(text).sentiment.polarity

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


def classify(text: str) -> dict:
    """
    Classify sentiment of a single text string.

    Returns:
        {
            "label":    "positive" | "negative" | "neutral",
            "score":    float,   # confidence proxy (0–1)
            "compound": float,   # [-1, 1]
        }
    """
    if not text or not text.strip():
        return {"label": "neutral", "score": 0.0, "compound": 0.0}

    if _BACKEND == "openai" and _OPENAI_API_KEY:
        return _openai_classify(text)

    return _textblob_classify(text)

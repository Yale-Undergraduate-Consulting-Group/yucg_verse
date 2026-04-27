"""
Sentiment classification.

Reads SENTIMENT_BACKEND from the environment (default: "openai").
  - "openai"  → OpenAI Chat Completions (requires OPENAI_API_KEY)
  - anything else → TextBlob fallback (no API key needed)
"""

import json
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

_BACKEND = os.getenv("SENTIMENT_BACKEND", "openai").lower()
_OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

_OPENAI_BATCH_SIZE = 50  # texts per batch call — keeps prompt well under token limits

_openai_client = None


def _get_openai_client():
    global _openai_client
    if _openai_client is None:
        from openai import OpenAI
        _openai_client = OpenAI(api_key=_OPENAI_API_KEY)
    return _openai_client


def _openai_classify(text: str) -> dict:
    client = _get_openai_client()

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


def _openai_classify_batch_chunk(texts: list[str]) -> list[dict]:
    """Classify a single chunk of texts in one OpenAI API call."""
    client = _get_openai_client()

    numbered = "\n".join(f"{i+1}. {t[:500]}" for i, t in enumerate(texts))

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a sentiment classifier. "
                    "You will receive a numbered list of texts. "
                    "For each, classify sentiment as positive, negative, or neutral, "
                    "and provide a compound score between -1.0 and 1.0. "
                    "Respond with a JSON array only, with one object per input, in order. "
                    'Format: [{"label": "positive"|"negative"|"neutral", "compound": <float>}, ...]'
                ),
            },
            {"role": "user", "content": numbered},
        ],
        temperature=0,
    )

    raw = response.choices[0].message.content or "[]"
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    try:
        items = json.loads(raw)
    except json.JSONDecodeError:
        return [{"label": "neutral", "score": 0.0, "compound": 0.0}] * len(texts)

    results = []
    for item in items:
        label = str(item.get("label", "neutral")).lower()
        compound = float(item.get("compound", 0.0))
        compound = max(-1.0, min(1.0, compound))
        if label == "positive":
            score = (compound + 1.0) / 2.0
        elif label == "negative":
            score = (1.0 - compound) / 2.0
        else:
            score = 1.0 - abs(compound) * 0.5
        results.append({"label": label, "score": round(score, 4), "compound": round(compound, 4)})

    while len(results) < len(texts):
        results.append({"label": "neutral", "score": 0.0, "compound": 0.0})

    return results[:len(texts)]


def _openai_classify_batch(texts: list[str]) -> list[dict]:
    """Classify texts in batched OpenAI API calls to stay within token limits."""
    results = []
    for i in range(0, len(texts), _OPENAI_BATCH_SIZE):
        chunk = texts[i : i + _OPENAI_BATCH_SIZE]
        results.extend(_openai_classify_batch_chunk(chunk))
    return results


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


def classify_batch(texts: list[str]) -> list[dict]:
    """
    Classify sentiment for a list of texts.

    Uses a single batched OpenAI API call when the OpenAI backend is active,
    otherwise falls back to calling classify() on each text individually.

    Returns a list of dicts in the same order as the input:
        [{"label": ..., "score": ..., "compound": ...}, ...]
    """
    if not texts:
        return []

    if _BACKEND == "openai" and _OPENAI_API_KEY:
        return _openai_classify_batch(texts)

    return [_textblob_classify(t) if t and t.strip() else {"label": "neutral", "score": 0.0, "compound": 0.0} for t in texts]

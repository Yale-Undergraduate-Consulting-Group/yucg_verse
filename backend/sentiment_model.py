"""
Shared sentiment model — single instance loaded once at startup.

To swap models, change MODEL_ID. The classify() interface stays the same
regardless of which model is active, as long as it outputs positive/negative/neutral labels.

Tested models:
  "distilbert-base-uncased-finetuned-sst-2-english"   ~260MB, fast, POSITIVE/NEGATIVE only
  "cardiffnlp/twitter-roberta-base-sentiment-latest"  ~500MB, 3-class incl. NEUTRAL
"""

from transformers import pipeline as hf_pipeline

# ── Swap model here ───────────────────────────────────────────────────────────
MODEL_ID = "distilbert-base-uncased-finetuned-sst-2-english"
# MODEL_ID = "cardiffnlp/twitter-roberta-base-sentiment-latest"
# ─────────────────────────────────────────────────────────────────────────────

_clf = hf_pipeline(
    task="sentiment-analysis",
    model=MODEL_ID,
    truncation=True,
    max_length=256,
)


def classify(text: str) -> dict:
    """
    Classify sentiment of a single text string.

    Returns:
        {
            "label":    "positive" | "negative" | "neutral",
            "score":    float,   # model confidence (0–1)
            "compound": float,   # [-1, 1]; positive→(2s-1), negative→(1-2s), neutral→0
        }
    """
    if not text or not text.strip():
        return {"label": "neutral", "score": 0.0, "compound": 0.0}

    res = _clf(text)[0]
    label = res["label"].lower()
    score = float(res["score"])

    if label == "positive":
        compound = score - (1.0 - score)
    elif label == "negative":
        compound = (1.0 - score) - score
    else:
        compound = 0.0

    return {"label": label, "score": score, "compound": compound}

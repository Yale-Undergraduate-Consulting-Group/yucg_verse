"""
Sentiment classification — dual-strategy implementation.

Controlled by the SENTIMENT_BACKEND environment variable:

    Strategy 1: SENTIMENT_BACKEND=openai Use OpenAI GPT-4o-mini (default)
        ^^^This strategy directly calls on OpenAI's LLM, is probably the most accurate model we can find
        in terms of NLP & contextual processing, but we have little control over what model to use since it's
        purely based on OpenAI's whim.
        
        We are currently choosing strategy 1 because its the easiest to maintain, relatively cheap, and accurate.
        
    Strategy 2: SENTIMENT_BACKEND=railway   Use Cardiff RoBERTa via Railway ML microservice
        ^^^This strategy allows us to setup our own ML service, giving us full control
        on the ML model we want to use and makes the results deterministic rather thn probabilistic
        however, this strategy requires much more engineering maintenance, essentially giving us another
        platform/tool to maintain on railway, the tradeoff is more control for more complexity.
        
    Economy of both strategies:
    Strategy 1: GPT-4o-mini is priced at $0.15 per 1M input tokens and $0.60 per 1M output tokens.
    
    Input Tokens:
        A. Tokens per Transcript
        Tokens per word: 1.33 (typical OpenAI conversion rate)
        Words in ~30 minute interview transcript: 140 (wpm) * 30 (mins) = 4200 words
        4200 * 1.33 = 5586 tokens per transcript
        
        B. Tokens per API Call — each call sends propmt + one sentence (script breaks down by sentence)
        System prompt: ~60 words * 1.33 = ~80 tokens
        Each sentence: ~17 words * 1.33 = ~23 tokens
        Input tokens per API call: 80 + 23 = ~103 tokens
    
    Output Tokens:
        A. Output tokens per API call
        Model returns a short json string each time in time in the format of:
        {"label": "positive", "score": 0.97, "compound": 0.95}
        ^^^take ~20 tokens per call
    
    Total Sentences:
        Each sentence triggers an API call (how the script is built, can be optimized)
        pipeline calls calssify() once per sentence
        4200 words / 17 words per sentence = ~247 sentences
    
    Total Tokens for the full pipeline:
        Input: 247 calls * 103 tokens = 25,441 input tokens
        Output: 247 calls * 20 tokens = 4940 output tokens
    
    Cost Calculation:
        Input cost: 25441 * ($0.15/1000000) = $0.003816
        Output cost: 4940 * ($0.60/1000000) = $0.002964
        
    Total Cost per transcript (assumptions made on 30 min transcript) = $0.006780
    ^^^roughly $0.007 per transcript
    
    100 transcripts analyzed would cost $0.68
    1000 transcripts would cost $6.8 
    
    Strategy 2:

Both strategies return the same dict format so the rest of the pipeline
never needs to know which backend is active:
    {
        "label":    "positive" | "negative" | "neutral",
        "score":    float,   # confidence 0.0–1.0
        "compound": float    # [-1, 1], used throughout the pipeline
    }

TextBlob is kept as a fallback in case both primary strategies fail.
"""

import os

# ─────────────────────────────────────────────────────────────────────────────
# ROUTER — reads the environment variable and calls the right strategy
# ─────────────────────────────────────────────────────────────────────────────

SENTIMENT_BACKEND = os.getenv("SENTIMENT_BACKEND", "openai").lower().strip()


def classify(text: str) -> dict:
    """
    Main entry point. Called by both reddit_sentiment_analyzer.py
    and full_sentiment_analyzer_pipeline.py.

    Routes to OpenAI or Railway depending on SENTIMENT_BACKEND.
    Falls back to TextBlob if the selected strategy fails.
    """
    if SENTIMENT_BACKEND == "railway":
        return _railway_classify(text)
    else:
        # Default: openai
        return _openai_classify(text)


# ─────────────────────────────────────────────────────────────────────────────
# STRATEGY A — OpenAI GPT-4o-mini (default)
# Requires: OPENAI_API_KEY environment variable
# ─────────────────────────────────────────────────────────────────────────────

_openai_client = None

def _get_openai_client():
    """Lazy-load the OpenAI client so it's only created when actually needed."""
    global _openai_client
    if _openai_client is None:
        from openai import OpenAI
        _openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return _openai_client


_OPENAI_SYSTEM_PROMPT = """You are a sentiment classifier. Analyze the sentiment of
the text the user sends and respond ONLY with valid JSON — no extra text, no markdown,
no code fences. Use exactly this format:
{"label": "positive" | "negative" | "neutral", "score": <float 0.0-1.0>, "compound": <float -1.0-1.0>}

Rules:
- label: the dominant sentiment
- score: your confidence in that label (0.0 = no confidence, 1.0 = certain)
- compound: overall sentiment intensity. Positive → up to 1.0. Negative → down to -1.0. Neutral → near 0.0."""


def _openai_classify(text: str) -> dict:
    """
    Classify sentiment using GPT-4o-mini.
    Falls back to TextBlob if the API call fails.
    """
    import json
    try:
        from openai import OpenAIError
        client = _get_openai_client()
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0,    # deterministic — same input always gives same output
            max_tokens=60,    # the JSON response is short; cap tokens to save cost
            messages=[
                {"role": "system", "content": _OPENAI_SYSTEM_PROMPT},
                {"role": "user",   "content": text[:2000]}
            ]
        )
        raw = response.choices[0].message.content.strip()
        return json.loads(raw)

    except Exception as e:
        print(f"[sentiment_model] OpenAI call failed ({e}), falling back to TextBlob")
        return _textblob_classify(text)


# ─────────────────────────────────────────────────────────────────────────────
# STRATEGY B — Railway ML microservice (scalable framework)
# Requires: ML_SERVICE_URL and ML_SERVICE_SECRET environment variables
# Deploy ml_service/ to Railway before activating this strategy
# ─────────────────────────────────────────────────────────────────────────────

def _railway_classify(text: str) -> dict:
    """
    Classify sentiment via the Railway-hosted Cardiff RoBERTa microservice.
    Falls back to TextBlob if the service is unreachable.
    """
    import requests
    from requests.exceptions import RequestException

    ml_service_url = os.getenv("ML_SERVICE_URL", "http://localhost:8001")
    ml_service_secret = os.getenv("ML_SERVICE_SECRET", "")
    headers = {"X-Internal-Secret": ml_service_secret} if ml_service_secret else {}

    try:
        response = requests.post(
            f"{ml_service_url}/analyze",
            json={"text": text},
            headers=headers,
            timeout=30
        )
        response.raise_for_status()
        return response.json()["result"]

    except RequestException as e:
        print(f"[sentiment_model] Railway ML service unreachable ({e}), falling back to TextBlob")
        return _textblob_classify(text)


# ─────────────────────────────────────────────────────────────────────────────
# FALLBACK — TextBlob
# Used automatically if both primary strategies fail
# No API key or external service required
# ─────────────────────────────────────────────────────────────────────────────

def _textblob_classify(text: str) -> dict:
    """
    TextBlob fallback — lightweight, no external dependencies.
    Only runs if the selected primary strategy fails.
    """
    import nltk
    from textblob import TextBlob
    nltk.download("punkt", quiet=True)
    nltk.download("punkt_tab", quiet=True)
    nltk.download("averaged_perceptron_tagger_eng", quiet=True)

    if not text or not text.strip():
        return {"label": "neutral", "score": 0.0, "compound": 0.0}

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
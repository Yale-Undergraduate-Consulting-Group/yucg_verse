# ml_service/main.py
# Cardiff RoBERTa sentiment microservice
# Deploy this to Railway when ready to switch from OpenAI to the ML microservice

import os
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from transformers import pipeline

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="YUCG ML Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

ML_SERVICE_SECRET = os.getenv("ML_SERVICE_SECRET", "")

# -------------------------------------------------------------------
# Model loads ONCE at startup and stays in memory.
# Every request reuses this — no reloading per request.
# This is why the microservice solves the Vercel memory problem.
# -------------------------------------------------------------------
logger.info("Loading Cardiff sentiment model...")
sentiment_pipeline = pipeline(
    task="sentiment-analysis",
    model="cardiffnlp/twitter-roberta-base-sentiment-latest",
    top_k=None,
    truncation=True,
    max_length=512
)
logger.info("Model ready.")

LABEL_MAP = {
    "LABEL_0": "negative",
    "LABEL_1": "neutral",
    "LABEL_2": "positive"
}


@app.middleware("http")
async def verify_secret(request: Request, call_next):
    if request.url.path == "/health":
        return await call_next(request)
    if ML_SERVICE_SECRET:
        if request.headers.get("X-Internal-Secret", "") != ML_SERVICE_SECRET:
            return JSONResponse(status_code=403, content={"error": "Forbidden"})
    return await call_next(request)


class AnalyzeRequest(BaseModel):
    text: str | None = None
    texts: list[str] | None = None


@app.get("/health")
def health():
    return {"status": "ok", "model": "cardiffnlp/twitter-roberta-base-sentiment-latest"}


@app.post("/analyze")
def analyze(request: AnalyzeRequest):
    if request.texts:
        texts = [t[:1000] for t in request.texts]
    elif request.text:
        texts = [request.text[:1000]]
    else:
        return JSONResponse(status_code=400, content={"error": "Provide 'text' or 'texts'"})

    raw_results = sentiment_pipeline(texts)

    formatted = []
    for result in raw_results:
        best = max(result, key=lambda x: x["score"])
        label = LABEL_MAP.get(best["label"], best["label"])
        score = round(best["score"], 4)
        compound = score if label == "positive" else (-score if label == "negative" else 0.0)
        formatted.append({
            "label": label,
            "score": score,
            "compound": round(compound, 4)
        })

    if request.texts:
        return {"results": formatted}
    return {"result": formatted[0]}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
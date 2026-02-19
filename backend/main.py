from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import uvicorn
import PyPDF2
import io

app = FastAPI(
    title="YUCG Analytics API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check
@app.get("/health")
async def health_check():
    return {"status": "ok"}

# Sentiment analysis for PDFs
@app.post("/api/analyze_sentiment")
async def analyze_sentiment(files: List[UploadFile] = File(...)):
    results = []

    for file in files:
        if not file.filename or not file.filename.lower().endswith(".pdf"):
            results.append({
                "filename": file.filename or "unknown",
                "error": "Only PDF files are supported"
            })
            continue

        try:
            content = await file.read()
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))

            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() or ""

            word_count = len(text.split())
            char_count = len(text)
            page_count = len(pdf_reader.pages)

            # Super basic sentiment: count positive/negative words
            positive_words = ["good", "great", "excellent", "happy", "positive", "love", "amazing", "wonderful", "fantastic", "best"]
            negative_words = ["bad", "terrible", "awful", "sad", "negative", "hate", "worst", "horrible", "poor", "disappointing"]

            text_lower = text.lower()
            positive_count = sum(text_lower.count(word) for word in positive_words)
            negative_count = sum(text_lower.count(word) for word in negative_words)

            if positive_count > negative_count:
                sentiment = "positive"
            elif negative_count > positive_count:
                sentiment = "negative"
            else:
                sentiment = "neutral"

            results.append({
                "filename": file.filename,
                "page_count": page_count,
                "word_count": word_count,
                "char_count": char_count,
                "sentiment": sentiment,
                "positive_word_count": positive_count,
                "negative_word_count": negative_count
            })
        except Exception as e:
            results.append({
                "filename": file.filename,
                "error": str(e)
            })

    return {"results": results}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

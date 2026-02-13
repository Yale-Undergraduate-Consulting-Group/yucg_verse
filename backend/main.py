from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

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


# Transcript upload
@app.post("/api/transcripts/upload")
async def upload_transcript(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    allowed_extensions = [".txt", ".csv", ".docx"]
    file_ext = "." + file.filename.split(".")[-1].lower() if "." in file.filename else ""

    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"File type not supported. Allowed: {', '.join(allowed_extensions)}"
        )

    content = await file.read()

    return {
        "filename": file.filename,
        "size": len(content),
        "status": "uploaded"
    }


# Transcript analysis
class AnalyzeRequest(BaseModel):
    transcript_text: str


@app.post("/api/transcripts/analyze")
async def analyze_transcript(request: AnalyzeRequest):
    # TODO: Implement actual sentiment analysis
    return {
        "overall_sentiment": 0.0,
        "sentiment_label": "neutral",
        "details": {}
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

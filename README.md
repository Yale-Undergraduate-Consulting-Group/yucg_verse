# YUCG Analytics

Internal analytics platform for the Yale Undergraduate Consulting Group.


## Getting Started

### Backend

Python 3.11+ is required.

Using `uv` (recommended):

```bash
cd backend
uv venv --python 3.11 .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
uv pip install -r requirements.txt
python main.py
```

If `uv` is not installed, install it first (`brew install uv` on macOS).

The API will be available at `http://localhost:8000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:3000`

## Tools

- **Sentiment Analyzer** - Analyze interview transcripts for sentiment insights

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4
- **Backend**: FastAPI, Python 3.11+

## Proper Git Pull Method
1. Ensure main branch is up to date & synced with local machine
```bash
git checkout main
git pull origin main
```

2. Create & switch to new branch — name the branch something descriptive & specific to use case
```bash
git checkout -b branch-name
```

3. Change Making:
```bash
# See what files you've changed
git status

# Stage all changed files
git add .

# Stage specific files only
git add "insert specific file path"
```

4. Commit with clear message
```bash
git commit -m "Added 'description' to project"
```

5. Push branch to GitHub
```bash
git push origin branch-name
```

## Sentiment Analysis Strategy

The sentiment analysis pipeline runs on every interview transcript sentence and every Reddit post.
Because the backend is hosted on Vercel's basic plan (256MB memory limit), loading a transformer
model like Cardiff RoBERTa directly on the server causes an out-of-memory crash. Two strategies
were evaluated to solve this.

---

### Strategy A: OpenAI API (current default)

Sentiment is classified by sending each sentence to OpenAI's GPT-4o-mini model via HTTP.
The model runs on OpenAI's servers — the backend never loads any model into memory.

**Pros**
- Zero memory overhead on Vercel — no model loaded locally
- Superior sentiment quality — GPT-4o-mini understands sarcasm, context, and nuance
- No second service to deploy or maintain
- Simple codebase — the entire implementation is ~30 lines in `sentiment_model.py`
- Low cost — approximately $0.007 per 30-minute transcript (~4,200 words)

**Cons**
- Per-request cost (though negligible at YUCG's usage volume)
- Dependent on OpenAI's availability and pricing decisions

**Required environment variable:**
```
OPENAI_API_KEY=sk-your-key-here
```

---

### Strategy B: Railway ML Microservice (future scalable option)

A second FastAPI app (`ml_service/`) loads the Cardiff RoBERTa transformer once at startup
and keeps it in memory. The main backend calls it over HTTP instead of loading the model itself.
This service is fully written and ready to deploy — it is dormant until activated.

**Pros**
- Flat monthly cost (~$5/month on Railway) regardless of usage volume
- No rate limits — you own the infrastructure
- Uses Cardiff RoBERTa, a model purpose-built for social media sentiment

**Cons**
- Requires a second deployed service to maintain
- More complex — two services, two deployments, keep-alive ping required
- Higher engineering ramp-up cost for future maintainers

**Required environment variables (when active):**
```
ML_SERVICE_URL=https://your-service.up.railway.app
ML_SERVICE_SECRET=your-shared-secret
```

---

### Why OpenAI now, Railway later

OpenAI was chosen as the default because it requires zero infrastructure beyond an API key,
produces better sentiment quality, and costs under $1/semester at YUCG's usage volume.
The Railway microservice is preserved as a ready-to-activate option for if usage scales
to a point where per-request OpenAI costs become meaningful.

---

### How the switch works

A single environment variable in `backend/.env` controls which strategy is active:

```bash
SENTIMENT_BACKEND=openai    # uses OpenAI GPT-4o-mini (default)
SENTIMENT_BACKEND=railway   # uses Cardiff RoBERTa via Railway microservice
```

Both strategies are implemented in `backend/sentiment_model.py`. The router at the top
of that file reads `SENTIMENT_BACKEND` and calls the appropriate strategy. Both return
the same output format so nothing else in the pipeline needs to change:

```python
{"label": "positive" | "negative" | "neutral", "score": float, "compound": float}
```

The `classify()` function in `sentiment_model.py` is the single entry point for all
sentiment analysis — both `reddit_sentiment_analyzer.py` and
`full_sentiment_analyzer_pipeline.py` import and call it.

---

### Steps to activate Railway (when ready)

1. Deploy `ml_service/` to Railway
```bash
# In Railway dashboard:
# New Project → Deploy from GitHub → select yucg_verse
# Settings → Source → Root Directory: ml_service
# Settings → Deploy → Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
```

2. Generate a shared secret and set it in Railway's environment variables
```bash
python -c "import secrets; print(secrets.token_hex(32))"
# Add to Railway: ML_SERVICE_SECRET=<output>
```

3. Set the Railway URL and secret in your main backend environment variables
```bash
ML_SERVICE_URL=https://your-service.up.railway.app
ML_SERVICE_SECRET=<same secret as above>
```

4. Set up a keep-alive ping at cron-job.org to prevent Railway from sleeping
```
URL:      https://your-service.up.railway.app/health
Schedule: Every 10 minutes
Method:   GET
```

5. Switch the active backend
```bash
# In backend/.env (local) or Vercel dashboard (production):
SENTIMENT_BACKEND=railway
```

6. Smoke test — run a Reddit analysis and a transcript analysis end to end and confirm
sentiment labels appear correctly.

To revert to OpenAI at any time, set `SENTIMENT_BACKEND=openai` and restart the backend.
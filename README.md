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

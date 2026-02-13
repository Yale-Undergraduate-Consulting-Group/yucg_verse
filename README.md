# YUCG Analytics

Internal analytics platform for the Yale Undergraduate Consulting Group.

## Project Structure

```
├── frontend/          # Next.js web application
│   ├── app/
│   │   ├── components/
│   │   ├── sentiment-analyzer/
│   │   └── page.tsx
│   └── public/
└── backend/           # FastAPI server
    └── main.py
```

## Getting Started

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

The API will be available at `http://localhost:8000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:3000`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/transcripts/upload` | Upload transcript file |
| POST | `/api/transcripts/analyze` | Analyze transcript text |

## Tools

- **Sentiment Analyzer** - Analyze interview transcripts for sentiment insights

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4
- **Backend**: FastAPI, Python 3.11+

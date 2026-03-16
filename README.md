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
'''bash
git checkout main
git pull origin main
'''

2. Create & switch to new branch — name the branch something descriptive & specific to use case
'''bash
git checkout -b branch-name
'''

3. Change Making:
'''bash
# See what files you've changed
git status

# Stage all changed files
git add

# Store specific files only:
git add *specific file path
'''

4. Commit with clear message
'''bash
git commit-m "Added xkjchkajhsd to project"
'''

5. Push branch to GitHub
'''bash
git push origin branch-name
'''


# YUCG Analytics — Platform Overview

*Yale Undergraduate Consulting Group · Internal Analytics Platform*

YUCG Analytics is a web-based platform that turns unstructured customer and market feedback — interview transcripts, online reviews, and social discussion — into structured sentiment insights. Each tool is AI-powered, runs in the browser, and produces exportable results for client engagements.

---

## Tools

### Sentiment Analyzer (Interview Transcripts)
Upload one or more interview transcripts and extract sentiment toward a specific company or product.

- Accepts `.docx`, `.txt`, and `.pdf` transcript files (multiple at once).
- Tags speakers, splits transcripts to the sentence level, and scores sentiment per sentence.
- Produces a per-interviewee summary: overall sentiment, sentence counts, and a positive/neutral/negative breakdown.
- Separates mentions of the target company from named competitors, so feedback is attributed correctly.
- Generates a word-sentiment scatter plot showing which terms drive positive vs. negative perception, with editable chart titles and axis labels.

### Reddit Analyzer
Measure public sentiment around any topic across Reddit communities.

- Search a single subreddit or several at once for a chosen query.
- Filter by time range and result volume.
- Returns overall sentiment statistics, a month-by-month sentiment trend, and the most distinctive ("keyness") terms in the discussion.
- Export full results to CSV for further analysis or reporting.

### Google Reviews Analyzer
Find businesses on a live map and analyze their Google reviews with AI sentiment scoring.

- Search for businesses by name or location and view them on an interactive map.
- Pull and analyze recent reviews for each selected location.
- Surfaces the most positive and most negative reviews per business, with sentiment scores.

### Analytics Dashboard
A password-protected internal view of platform usage.

- Tracks page views, analyses run, charts generated, and CSV downloads.
- Summarizes activity across all tools, including a recent-events feed.

---

## How It Works

Sentiment is classified using OpenAI's GPT-4o-mini, which interprets context, nuance, and tone rather than relying on simple keyword matching. The same scoring engine powers every tool, so results are consistent across transcripts, reviews, and social posts. A second, self-hosted model option (Cardiff RoBERTa) is built and held in reserve for higher usage volumes.

## Platform & Access

The platform runs entirely in the browser with no install required. The frontend is built on Next.js and React; the backend is a FastAPI service. Results from the Reddit and Google tools can be exported to CSV, and transcript charts can be downloaded as images.

## At a Glance

| Capability | Sentiment Analyzer | Reddit Analyzer | Google Reviews |
|---|---|---|---|
| Primary input | Interview transcripts | Reddit discussions | Google reviews |
| AI sentiment scoring | Yes | Yes | Yes |
| Trend over time | — | Yes | — |
| Competitor separation | Yes | — | — |
| Visual output | Word-sentiment chart | Trend + keyword stats | Top reviews |
| Export | Chart image | CSV | On-screen results |

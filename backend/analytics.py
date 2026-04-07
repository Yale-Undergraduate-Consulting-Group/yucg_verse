"""
Analytics: lightweight SQLite-based event tracking.
Records usage events and exposes aggregate summaries.
"""

import json
import os
import sqlite3
from datetime import datetime
from threading import Lock

DB_PATH = os.path.join(os.path.dirname(__file__), "analytics.db")
_lock = Lock()


def _conn() -> sqlite3.Connection:
    c = sqlite3.connect(DB_PATH, check_same_thread=False)
    c.row_factory = sqlite3.Row
    return c


def init_db() -> None:
    with _lock:
        c = _conn()
        c.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT    NOT NULL,
                metadata   TEXT,
                created_at TEXT    NOT NULL
            )
        """)
        c.commit()
        c.close()


def record(event_type: str, metadata: dict | None = None) -> None:
    with _lock:
        c = _conn()
        c.execute(
            "INSERT INTO events (event_type, metadata, created_at) VALUES (?, ?, ?)",
            (event_type, json.dumps(metadata or {}), datetime.utcnow().isoformat()),
        )
        c.commit()
        c.close()


def summary() -> dict:
    with _lock:
        c = _conn()

        # ── page views ──────────────────────────────────────────────────────
        total_views: int = c.execute(
            "SELECT COUNT(*) FROM events WHERE event_type = 'page_view'"
        ).fetchone()[0]

        page_breakdown: dict[str, int] = {}
        for row in c.execute(
            "SELECT metadata FROM events WHERE event_type = 'page_view'"
        ).fetchall():
            page = json.loads(row[0] or "{}").get("page", "unknown")
            page_breakdown[page] = page_breakdown.get(page, 0) + 1

        # ── transcript analyses ─────────────────────────────────────────────
        transcript_rows = c.execute(
            "SELECT metadata FROM events WHERE event_type = 'transcript_analysis'"
        ).fetchall()
        successful_transcripts = [
            json.loads(r[0] or "{}") for r in transcript_rows
            if json.loads(r[0] or "{}").get("success")
        ]
        total_transcript_analyses = len(successful_transcripts)
        total_transcripts_uploaded = sum(m.get("file_count", 0) for m in successful_transcripts)

        # ── graphs & plots ──────────────────────────────────────────────────
        total_graphs: int = c.execute(
            "SELECT COUNT(*) FROM events WHERE event_type = 'graph_generated'"
        ).fetchone()[0]

        total_plot_regen: int = c.execute(
            "SELECT COUNT(*) FROM events WHERE event_type = 'plot_regenerated'"
        ).fetchone()[0]

        # ── reddit analyses ─────────────────────────────────────────────────
        reddit_rows = c.execute(
            "SELECT metadata FROM events WHERE event_type = 'reddit_analysis'"
        ).fetchall()
        successful_reddit = [
            json.loads(r[0] or "{}") for r in reddit_rows
            if json.loads(r[0] or "{}").get("success")
        ]
        total_reddit_analyses = len(successful_reddit)
        total_subreddits = sum(m.get("subreddit_count", 0) for m in successful_reddit)

        # ── CSV downloads ───────────────────────────────────────────────────
        total_csv: int = c.execute(
            "SELECT COUNT(*) FROM events WHERE event_type = 'csv_downloaded'"
        ).fetchone()[0]

        # ── recent events (last 25) ─────────────────────────────────────────
        recent_events = [
            {
                "event_type": r["event_type"],
                "metadata":   json.loads(r["metadata"] or "{}"),
                "created_at": r["created_at"],
            }
            for r in c.execute(
                "SELECT event_type, metadata, created_at FROM events ORDER BY id DESC LIMIT 25"
            ).fetchall()
        ]

        c.close()

        return {
            "total_page_views":          total_views,
            "page_views_breakdown":      page_breakdown,
            "total_transcript_analyses": total_transcript_analyses,
            "total_transcripts_uploaded": total_transcripts_uploaded,
            "total_graphs_generated":    total_graphs,
            "total_plots_regenerated":   total_plot_regen,
            "total_reddit_analyses":     total_reddit_analyses,
            "total_subreddits_analyzed": total_subreddits,
            "total_csv_downloads":       total_csv,
            "recent_events":             recent_events,
        }

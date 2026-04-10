"""
Google Reviews Analyzer Pipeline

Searches for places via SerpAPI Google Maps, fetches their reviews,
runs GPT-4o-mini sentiment classification via classify_batch, and returns
top-N most positive and top-N most negative reviews per location.

Requires SERPAPI_KEY in backend/.env.
"""

import os
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from sentiment_model import classify_batch

SERPAPI_KEY  = os.getenv("SERPAPI_KEY", "")
_SERPAPI_URL = "https://serpapi.com/search"


def _geocode(location: str) -> tuple[float, float] | None:
    """Geocode a location string to (lat, lng) using Nominatim (free, no key)."""
    resp = requests.get(
        "https://nominatim.openstreetmap.org/search",
        params={"q": location, "format": "json", "limit": 1},
        headers={"User-Agent": "YUCG-Reviews-Analyzer/1.0"},
        timeout=8,
    )
    resp.raise_for_status()
    results = resp.json()
    if not results:
        return None
    return float(results[0]["lat"]), float(results[0]["lon"])


def _parse_place(place: dict) -> dict | None:
    """Extract a normalised place dict from a local_results or place_results entry."""
    coords = place.get("gps_coordinates", {})
    lat = coords.get("latitude")
    lng = coords.get("longitude")
    if not lat or not lng:
        return None
    return {
        "place_id":     place.get("place_id", ""),
        "data_id":      place.get("data_id", ""),
        "name":         place.get("title", ""),
        "address":      place.get("address", ""),
        "lat":          lat,
        "lng":          lng,
        "rating":       place.get("rating"),
        "review_count": place.get("reviews", 0),
    }


def search_places(query: str) -> list[dict]:
    """
    Search for businesses via SerpAPI Google Maps with pagination.
    Geocodes the location with Nominatim, uses a wide zoom level,
    and fetches up to 3 pages (≤60 results) for broad coverage.
    """
    if not SERPAPI_KEY:
        raise ValueError("SERPAPI_KEY not set in backend/.env")

    base_params: dict = {"engine": "google_maps", "q": query, "api_key": SERPAPI_KEY}

    coords = _geocode(query)
    if coords:
        lat, lng = coords
        # zoom 11z covers ~50km radius — wide enough for a city/region
        base_params["ll"] = f"@{lat},{lng},11z"

    results: list[dict] = []
    seen_ids: set[str] = set()

    # Fetch up to 2 pages (each page = 20 results)
    for page in range(2):
        params = {**base_params, "start": page * 20}
        try:
            resp = requests.get(_SERPAPI_URL, params=params, timeout=15)
            resp.raise_for_status()
            data = resp.json()
        except Exception:
            break

        local = data.get("local_results", [])

        # Single place fallback on first page only
        if not local and page == 0 and "place_results" in data:
            parsed = _parse_place(data["place_results"])
            if parsed:
                results.append(parsed)
            break

        if not local:
            break  # No more pages

        for place in local:
            parsed = _parse_place(place)
            if parsed and parsed["place_id"] not in seen_ids:
                seen_ids.add(parsed["place_id"])
                results.append(parsed)

        # Stop if this page had fewer than 20 results (last page)
        if len(local) < 20:
            break

    return results


def _fetch_reviews(data_id: str) -> list[dict]:
    """Fetch reviews for a place via SerpAPI Google Maps Reviews."""
    resp = requests.get(
        _SERPAPI_URL,
        params={"engine": "google_maps_reviews", "data_id": data_id, "api_key": SERPAPI_KEY},
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()

    reviews = []
    for r in data.get("reviews", []):
        text = (r.get("snippet") or "").strip()
        if not text:
            continue
        reviews.append({
            "author": r.get("user", {}).get("name", "Anonymous"),
            "rating": r.get("rating", 3),
            "text":   text,
            "date":   r.get("date", ""),
        })
    return reviews


def analyze_place(place: dict, n: int) -> dict:
    """Fetch and sentiment-analyze reviews for a single place."""
    try:
        reviews = _fetch_reviews(place.get("data_id", ""))
    except Exception as e:
        return {**place, "error": str(e), "top_positive": [], "top_negative": [], "all_reviews": []}

    if not reviews:
        return {
            **place,
            "total_reviews_analyzed": 0,
            "avg_sentiment":  0.0,
            "top_positive":   [],
            "top_negative":   [],
            "all_reviews":    [],
        }

    sentiments = classify_batch([r["text"] for r in reviews])
    for review, sentiment in zip(reviews, sentiments):
        review["sentiment_label"]    = sentiment["label"]
        review["sentiment_compound"] = sentiment["compound"]

    sorted_desc   = sorted(reviews, key=lambda r: r["sentiment_compound"], reverse=True)
    sorted_asc    = sorted(reviews, key=lambda r: r["sentiment_compound"])
    avg_sentiment = sum(r["sentiment_compound"] for r in reviews) / len(reviews)

    return {
        **place,
        "total_reviews_analyzed": len(reviews),
        "avg_sentiment":          round(avg_sentiment, 4),
        "top_positive":           sorted_desc[:n],
        "top_negative":           sorted_asc[:n],
        "all_reviews":            reviews,
    }


def analyze_places(places: list[dict], n: int) -> list[dict]:
    """Analyze multiple places in parallel (max 5 workers)."""
    results = [None] * len(places)

    def _run(idx: int, place: dict):
        results[idx] = analyze_place(place, n)

    with ThreadPoolExecutor(max_workers=min(len(places), 5)) as executor:
        futures = [executor.submit(_run, i, p) for i, p in enumerate(places)]
        for f in futures:
            f.result()

    return results

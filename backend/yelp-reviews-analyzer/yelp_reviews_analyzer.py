"""
Yelp Reviews Analyzer Pipeline

Scrapes Yelp search results to find business locations (with coordinates),
then paginates through each business's review pages, runs GPT-4o-mini
sentiment classification via classify_batch, and returns top-x most
positive and top-x most negative reviews per location.

No API key required — uses Yelp's public __NEXT_DATA__ JSON blob.
"""

import json
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import os
import urllib.parse
import requests
import cloudscraper
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from sentiment_model import classify_batch

_BIZ_URL          = "https://www.yelp.com/biz/{slug}"
_REVIEWS_PER_PAGE = 10
_PAGES_TO_SCRAPE  = 4   # 4 pages × 10 = 40 review candidates per location
_REQUEST_DELAY    = 1.0  # seconds between requests to the same location

# Module-level scraper — reused across requests
_scraper: cloudscraper.CloudScraper | None = None


def _get_scraper() -> cloudscraper.CloudScraper:
    global _scraper
    if _scraper is None:
        _scraper = cloudscraper.create_scraper(
            browser={"browser": "chrome", "platform": "darwin", "mobile": False}
        )
    return _scraper


def _get_next_data(url: str) -> dict:
    """Fetch a Yelp business page and extract its __NEXT_DATA__ JSON blob."""
    scraper = _get_scraper()
    resp = scraper.get(url, timeout=15)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")
    tag  = soup.find("script", id="__NEXT_DATA__")
    if not tag or not tag.string:
        raise RuntimeError(f"__NEXT_DATA__ not found at {url}")
    return json.loads(tag.string)


def _search_bing(query: str) -> list[str]:
    """
    Scrape Bing search results to find Yelp business slugs.
    Returns a list of yelp.com/biz/... slugs.
    """
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }

    slugs = []
    seen: set[str] = set()

    def _extract_from_html(html: str):
        # Search all href and text content for yelp.com/biz/ patterns
        for m in re.finditer(r"yelp\.com/biz/([\w-]+)", html):
            slug = m.group(1)
            if slug not in seen:
                seen.add(slug)
                slugs.append(slug)

    # Try 1: Bing with site: operator
    try:
        q = urllib.parse.quote(f"site:yelp.com/biz {query}")
        resp = requests.get(
            f"https://www.bing.com/search?q={q}&count=20",
            headers=headers, timeout=12
        )
        if resp.status_code == 200:
            _extract_from_html(resp.text)
    except Exception:
        pass

    # Try 2: Bing without site: filter, just "yelp" appended
    if not slugs:
        try:
            q = urllib.parse.quote(f"{query} yelp reviews")
            resp = requests.get(
                f"https://www.bing.com/search?q={q}&count=20",
                headers=headers, timeout=12
            )
            if resp.status_code == 200:
                _extract_from_html(resp.text)
        except Exception:
            pass

    return slugs[:10]


def _fetch_biz_summary(slug: str) -> dict | None:
    """
    Fetch a Yelp business page and extract name, address, coordinates, rating.
    Returns None if the page can't be parsed.
    """
    try:
        data = _get_next_data(_BIZ_URL.format(slug=slug))
        props = data.get("props", {}).get("pageProps", {})

        # Try businessPageProps first
        bpp = props.get("businessPageProps", {})
        biz = bpp.get("businessDetails", bpp.get("business", {}))

        # Fallback: top-level bizDetails
        if not biz:
            biz = props.get("bizDetails", {})

        name = biz.get("name", "") or biz.get("businessName", "")
        if not name:
            return None

        coords = biz.get("coordinates", {})
        lat = coords.get("latitude") or biz.get("latitude")
        lng = coords.get("longitude") or biz.get("longitude")

        loc = biz.get("location", {})
        address = ", ".join(filter(None, [
            loc.get("address1", ""),
            loc.get("city", ""),
            loc.get("state", ""),
        ]))

        return {
            "biz_id":       slug,
            "name":         name,
            "slug":         slug,
            "address":      address,
            "lat":          lat,
            "lng":          lng,
            "rating":       biz.get("rating"),
            "review_count": biz.get("reviewCount", 0),
        }
    except Exception:
        return None


def _extract_businesses(data: dict) -> list[dict]:
    """
    Pull business listings from a Yelp search __NEXT_DATA__ blob.
    Returns list of dicts with: biz_id, name, slug, address, lat, lng, rating, review_count.
    """
    results = []
    try:
        # Path may vary — try both known structures
        props = data.get("props", {}).get("pageProps", {})
        search_page_props = props.get("searchPageProps", {})
        hits = (
            search_page_props
            .get("mainContentComponentsListProps", [])
        )
        # Filter to business result objects
        biz_hits = [
            h for h in hits
            if isinstance(h, dict) and h.get("componentName") == "businessResult"
        ]
        for hit in biz_hits:
            biz = hit.get("bizId") or hit.get("businessId")
            props_inner = hit.get("props", {})
            biz_data  = props_inner if props_inner else {}

            # Try extracting from searchResultBusiness structure
            srb = biz_data.get("searchResultBusiness", biz_data)
            name     = srb.get("name", "")
            slug     = srb.get("businessUrl", "").rstrip("/").split("/")[-1] or srb.get("alias", "")
            rating   = srb.get("rating")
            rev_cnt  = srb.get("reviewCount", 0)
            location = srb.get("location", {})
            address  = ", ".join(filter(None, [
                location.get("address1", ""),
                location.get("city", ""),
                location.get("state", ""),
            ]))
            lat = srb.get("latitude") or srb.get("lat")
            lng = srb.get("longitude") or srb.get("lng")

            if name and slug:
                results.append({
                    "biz_id":       biz or slug,
                    "name":         name,
                    "slug":         slug,
                    "address":      address,
                    "lat":          lat,
                    "lng":          lng,
                    "rating":       rating,
                    "review_count": rev_cnt,
                })
    except Exception:
        pass

    # Fallback: parse from searchResultsProps or similar key
    if not results:
        try:
            page_props = data.get("props", {}).get("pageProps", {})
            sr = page_props.get("searchResultsProps", {})
            for biz in sr.get("searchResults", {}).get("business", []):
                name   = biz.get("name", "")
                slug   = biz.get("alias", "")
                rating = biz.get("rating")
                rev_cnt= biz.get("reviewCount", 0)
                coords = biz.get("coordinates", {})
                loc    = biz.get("location", {})
                address= ", ".join(filter(None, [
                    loc.get("address1",""),
                    loc.get("city",""),
                    loc.get("state",""),
                ]))
                if name and slug:
                    results.append({
                        "biz_id":       slug,
                        "name":         name,
                        "slug":         slug,
                        "address":      address,
                        "lat":          coords.get("latitude"),
                        "lng":          coords.get("longitude"),
                        "rating":       rating,
                        "review_count": rev_cnt,
                    })
        except Exception:
            pass

    return results


def _extract_reviews_from_page(data: dict) -> list[dict]:
    """
    Pull review objects from a Yelp business page __NEXT_DATA__ blob.
    Returns list of dicts: author, rating, text, date.
    """
    reviews = []
    try:
        props = data.get("props", {}).get("pageProps", {})

        # Structure 1: reviewFeedQueryProps
        review_feed = props.get("reviewFeedQueryProps", {})
        raw_reviews  = review_feed.get("reviews", [])

        # Structure 2: businessPageProps > reviewFeed
        if not raw_reviews:
            bpp = props.get("businessPageProps", {})
            raw_reviews = bpp.get("reviewFeedQueryProps", {}).get("reviews", [])

        for r in raw_reviews:
            text = (r.get("comment", {}) or {}).get("text", "").strip()
            if not text:
                continue
            reviews.append({
                "author": r.get("user", {}).get("markupDisplayName", "Anonymous"),
                "rating": r.get("rating", 3),
                "text":   text,
                "date":   r.get("localizedDate", ""),
            })
    except Exception:
        pass
    return reviews


def search_yelp(query: str, location: str = "") -> list[dict]:
    """
    Search Yelp businesses via DuckDuckGo (no API key required).
    Finds Yelp business slugs from DDG, then fetches each biz page for coords.
    Returns up to 10 results with coordinates for map pins.
    """
    global _scraper
    _scraper = None  # fresh scraper per search

    search_term = f"{query} {location}".strip()
    slugs = _search_bing(search_term)

    if not slugs:
        raise RuntimeError(f"No Yelp results found for '{search_term}'")

    # Fetch biz summaries in parallel (up to 10)
    results: list[dict | None] = [None] * len(slugs)

    def _fetch(idx: int, slug: str):
        results[idx] = _fetch_biz_summary(slug)
        if idx < len(slugs) - 1:
            time.sleep(0.4)  # small delay between biz page fetches

    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(_fetch, i, s) for i, s in enumerate(slugs)]
        for f in futures:
            f.result()

    return [r for r in results if r and r.get("lat") and r.get("lng")][:10]


def _scrape_reviews(slug: str) -> list[dict]:
    """
    Scrape up to _PAGES_TO_SCRAPE pages of reviews for a business slug.
    Adds delay between page requests to avoid rate limiting.
    """
    all_reviews = []
    for page in range(_PAGES_TO_SCRAPE):
        start = page * _REVIEWS_PER_PAGE
        url   = _BIZ_URL.format(slug=slug)
        if start > 0:
            url += f"?start={start}"
        try:
            data    = _get_next_data(url)
            reviews = _extract_reviews_from_page(data)
            if not reviews:
                break   # No more reviews — stop early
            all_reviews.extend(reviews)
            if len(reviews) < _REVIEWS_PER_PAGE:
                break   # Last page was partial
            if page < _PAGES_TO_SCRAPE - 1:
                time.sleep(_REQUEST_DELAY)
        except Exception:
            break
    return all_reviews


def analyze_location(biz: dict, x: int) -> dict:
    """
    Scrape and sentiment-analyze reviews for a single Yelp business.
    Returns per-location results with top-x positive and top-x negative.
    """
    slug = biz["slug"]
    try:
        reviews = _scrape_reviews(slug)
    except Exception as e:
        return {**biz, "error": str(e), "top_positive": [], "top_negative": [], "all_reviews": []}

    if not reviews:
        return {
            **biz,
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

    sorted_desc = sorted(reviews, key=lambda r: r["sentiment_compound"], reverse=True)
    sorted_asc  = sorted(reviews, key=lambda r: r["sentiment_compound"])
    avg_sentiment = sum(r["sentiment_compound"] for r in reviews) / len(reviews)

    return {
        **biz,
        "total_reviews_analyzed": len(reviews),
        "avg_sentiment":  round(avg_sentiment, 4),
        "top_positive":   sorted_desc[:x],
        "top_negative":   sorted_asc[:x],
        "all_reviews":    reviews,
    }


def analyze_locations(businesses: list[dict], x: int) -> list[dict]:
    """
    Analyze multiple Yelp locations in parallel (max 5 workers).
    """
    results = [None] * len(businesses)

    def _run(idx: int, biz: dict):
        results[idx] = analyze_location(biz, x)

    with ThreadPoolExecutor(max_workers=min(len(businesses), 5)) as executor:
        futures = [executor.submit(_run, i, b) for i, b in enumerate(businesses)]
        for f in futures:
            f.result()

    return results

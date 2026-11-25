#!/usr/bin/env python3
"""How well known is each answer? Look it up on English Wikipedia.

Summit's difficulty is mostly about whether an ordinary well-read person has
heard of the answer. Quizbowl's own signals miss that: tournament level says
how hard the *clues* are, and QB-curricula's importance score counts how
often quizbowl asks about something, which is low for things too famous to
bother asking ("papal conclave"). Average daily Wikipedia pageviews track
general fame well, so that is the signal here.

Input: a text file of answer strings, one per line (build_climbs.py
--dump-answers writes it). Output: a JSON cache, answer -> {title, views,
disambig}. Already-cached answers are skipped, so re-runs are cheap.

  python3 scripts/summit/answer_fame.py answers.txt scripts/summit/answer_fame.json
"""

from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

API = "https://en.wikipedia.org/w/api.php"
HEADERS = {"User-Agent": "SummitDailyQuiz/0.1 (answer-fame lookup; batch, cached)"}
BATCH = 50          # the API's title limit per request
PAUSE = 2.0         # seconds between requests: Wikimedia throttles shared addresses


def query(titles: list[str]) -> dict:
    params = {
        "action": "query", "format": "json", "formatversion": "2", "redirects": "1",
        "prop": "pageviews|pageprops", "ppprop": "disambiguation", "pvipdays": "60",
        "titles": "|".join(titles), "maxlag": "5",
    }
    url = f"{API}?{urllib.parse.urlencode(params)}"
    for attempt in range(8):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.load(resp)
            if "error" in data and data["error"].get("code") == "maxlag":
                time.sleep(5 * (attempt + 1))
                continue
            return data
        except urllib.error.HTTPError as exc:
            if exc.code == 429:  # throttled: wait it out, longer each time
                wait = int(exc.headers.get("Retry-After") or 0) or 60 * (attempt + 1)
                print(f"  throttled; waiting {wait}s", file=sys.stderr)
                time.sleep(wait)
                continue
            raise
        except Exception as exc:  # network hiccup: back off and retry
            print(f"  retry after {exc}", file=sys.stderr)
            time.sleep(5 * (attempt + 1))
    raise SystemExit("Wikipedia did not answer after 8 tries")


def resolve(batch: list[str], data: dict) -> dict[str, dict]:
    q = data.get("query", {})
    # Follow the API's own normalisation and redirects back to our strings.
    hop: dict[str, str] = {}
    for step in (q.get("normalized") or []) + (q.get("redirects") or []):
        hop[step["from"]] = step["to"]
    pages = {p["title"]: p for p in q.get("pages", [])}
    out = {}
    for answer in batch:
        title = answer
        for _ in range(4):
            if title in hop:
                title = hop[title]
        page = pages.get(title)
        if not page or page.get("missing") or page.get("invalid"):
            out[answer] = {"title": None, "views": 0.0, "disambig": False}
            continue
        days = [v for v in (page.get("pageviews") or {}).values() if v is not None]
        views = sum(days) / len(days) if days else 0.0
        out[answer] = {"title": page["title"], "views": round(views, 1),
                       "disambig": "pageprops" in page and "disambiguation" in page["pageprops"]}
    return out


def main() -> None:
    src, dst = Path(sys.argv[1]), Path(sys.argv[2])
    cache: dict[str, dict] = json.loads(dst.read_text()) if dst.exists() else {}
    wanted = [a.strip() for a in src.read_text(encoding="utf-8").splitlines() if a.strip()]
    # Titles can't contain these characters; such answers are left unknown.
    todo = sorted({a for a in wanted if a not in cache and not any(ch in a for ch in "#<>[]{}|")})
    print(f"{len(wanted):,} answers, {len(todo):,} to look up", file=sys.stderr)
    for i in range(0, len(todo), BATCH):
        batch = todo[i:i + BATCH]
        cache.update(resolve(batch, query(batch)))
        if (i // BATCH) % 20 == 0:
            print(f"  {i + len(batch):,}/{len(todo):,}", file=sys.stderr)
            dst.write_text(json.dumps(cache, ensure_ascii=False, sort_keys=True), encoding="utf-8")
        time.sleep(PAUSE)
    dst.write_text(json.dumps(cache, ensure_ascii=False, sort_keys=True), encoding="utf-8")
    known = sum(1 for v in cache.values() if v["title"] and not v["disambig"])
    print(f"cached {len(cache):,}; {known:,} resolve to a real article", file=sys.stderr)


if __name__ == "__main__":
    main()

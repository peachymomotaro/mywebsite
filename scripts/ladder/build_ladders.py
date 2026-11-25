#!/usr/bin/env python3
"""Build the daily Ladder puzzles from Matt Spry's QB-curricula database.

Ladder: one topic a day, ten questions that climb from middle-school to
open-level quizbowl difficulty. Every question is a real QB Reader bonus part.

Inputs (from a QB-curricula checkout, after fetch_sample.py, run_all.py,
import_data.py and score_topics.py):
  qb.sqlite      questions, clues, topic_tags, topic_aliases, topic_scores
  sample.jsonl   the raw QB Reader download (for the HTML answerlines, whose
                 underlining the answer checker needs)

Output: data/ladder/days/<n>.json, one per day, plus data/ladder/index.json.
Day n is START_DATE + n - 1 (UTC calendar dates; the site maps the player's
local date onto it).

Usage:
  python3 scripts/ladder/build_ladders.py --qb-dir ../qb-curricula
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import math
import random
import re
import sqlite3
import sys
from collections import defaultdict
from pathlib import Path

# ---------------------------------------------------------------------------
# SETTINGS
# ---------------------------------------------------------------------------

START_DATE = "2026-11-25"   # Ladder #1
DAYS = 365
SEED = 20261126
RUNGS = 10
# Target effective difficulty per rung (QB Reader scale: 1 middle school,
# 2-5 high school, 6-9 college, 10 open).
TARGETS = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0]
MIN_POOL = 250              # usable parts a topic needs to be a daily topic
REPEAT_GAP = 21             # days before a topic may come round again
QUESTION_REUSE_GAP = 120    # days before a bonus part may be reused

# Curricula (Matt's tag-path prefixes) and how to name them in the game.
# A topic qualifies only if it also clears MIN_POOL.
TOPICS: dict[str, str] = {
    "American/United States/Colonial": "Colonial America",
    "American/United States/Revolution": "The American Revolution",
    "American/United States/Early Republic": "The early American republic",
    "American/United States/Civil War": "The American Civil War",
    "American/United States/Gilded Age": "The Gilded Age",
    "American/United States/Progressive": "The Progressive Era",
    "American/United States/Depression": "The Great Depression and New Deal",
    "American/United States/Cold War": "Cold War America",
    "American/United States/Civil Rights": "The civil rights era",
    "American/United States/Contemporary": "Modern America",
    "European/Britain": "British history",
    "European/France": "French history",
    "European/Germany": "German history",
    "European/Russia": "Russian history",
    "European/Italy": "Italian history",
    "European/Spain": "Spanish history",
    "European/Scandinavia": "Scandinavian history",
    "European/Balkans": "The Balkans",
    "European/Papacy": "The papacy",
    "European/Byzantium": "The Byzantine Empire",
    "European/Holy Roman Empire": "The Holy Roman Empire",
    "European/Poland": "Polish history",
    "European/Netherlands": "Dutch history",
    "European/Ireland": "Irish history",
    "European/Austria": "Austrian history",
    "European/Portugal": "Portuguese history",
    "European/Hungary": "Hungarian history",
    "Ancient/Rome": "Ancient Rome",
    "Ancient/Greece": "Ancient Greece",
    "Ancient/Egypt": "Ancient Egypt",
    "Ancient/Mesopotamia": "Ancient Mesopotamia",
    "Ancient/Persia": "Ancient Persia",
    "Ancient/Levant": "The ancient Levant",
    "Ancient/India": "Ancient India",
    "Ancient/China": "Ancient China",
    "World/Africa": "African history",
    "World/Latin America": "Latin American history",
    "World/China": "Chinese history",
    "World/Middle East": "The Middle East",
    "World/India": "Indian history",
    "World/Southeast Asia": "Southeast Asian history",
    "World/Japan": "Japanese history",
    "World/Canada": "Canadian history",
    "World/Central Asia": "Central Asia",
    "World/Ottoman Empire": "The Ottoman Empire",
    "World/Pacific": "The Pacific",
    "World/Korea": "Korean history",
    "World/Mesoamerica": "Mesoamerica",
    "World/Andes": "The Andes",
    "World/Australia": "Australian history",
}

# ---------------------------------------------------------------------------

DIFFICULTY_LABELS = {
    1: "Middle school", 2: "Easy high school", 3: "Regular high school",
    4: "Hard high school", 5: "High school nationals", 6: "Easy college",
    7: "Regular college", 8: "Hard college", 9: "College nationals", 10: "Open",
}
MODIFIER_OFFSET = {"e": -0.7, "m": 0.0, "h": 0.7}

# Part openings that lean on an earlier part or on the leadin.
DEPENDENT_START = re.compile(
    r"^(?:He|She|It|They|His|Her|Its|Their|Him|Them|Those|These|That|"
    r"The same|This same|This other|Another|Also|Like|Unlike|Despite|"
    r"In (?:that|this) (?:same )?(?:year|war|battle|conflict|period|event)|"
    r"After (?:that|this)|Following (?:that|this))\b"
)
DEPENDENT_ANYWHERE = re.compile(
    r"\b(?:this (?:neighbou?ring|other|same|aforementioned|earlier|later|different)|"
    r"(?:a|this) different\b|(?:days|weeks|months|years|decades) (?:later|earlier|before|after)\b|the aforementioned|"
    r"the (?:above|previous|preceding|former|latter)|mentioned (?:above|earlier)|"
    r"answer(?:s)? to (?:the )?(?:first|second|third|previous|other) part|"
    r"from the (?:first|second|previous|last) part|that (?:man|woman|ruler|leader|"
    r"country|city|empire|battle|war|event|group)(?:'s)?\b)", re.I)
MULTI_ANSWER = re.compile(
    r"\b(?:name (?:both|all|either|each|any two|any three)|give (?:both|all|either)|"
    r"for (?:five|5|ten|10) points each|either order|name the (?:two|three)|"
    r"identify (?:both|all))\b", re.I)
BAD_ANSWERLINE = re.compile(
    r"description acceptable|accept any|accept descriptions?|answers? (?:may|can) vary|"
    r"any of the following|either order|in any order", re.I)
DATED = re.compile(
    r"\b(?:current(?:ly)?|incumbent|recent(?:ly)?|this year|last year|reigning|"
    r"sitting (?:president|prime minister)|as of (?:this|now)|nowadays|"
    r"(?:is|are) now)\b", re.I)
DEPENDENT_CLUE = re.compile(
    r"^(?:In response|Also|However|But|Later|After this|Afterwards|Meanwhile|Then)\b|"
    r"\b(?:that|those) (?:controversy|event|war|battle|incident|conflict|work|book|"
    r"speech|document|man|woman|city|country|group|organization|treaty|period|"
    r"year|movement|crisis|scandal|policy|law|decision|ruler|leader|place)\b", re.I)
GENERIC_LEADIN = re.compile(
    r"^(?:\d+\.\s*)?(?:answer|name|identify|give)\b.*\b(?:following|questions?|about|"
    r"these|some)\b", re.I)
MARKER = re.compile(r"^\s*\[(?:10)?\s*[emh]?\]\s*", re.I)
LEADIN_NUMBER = re.compile(r"^\s*\d+\.\s*")
WORD = re.compile(r"[a-z0-9]+")


def words(text: str) -> list[str]:
    return WORD.findall(text.lower())


def load_qb(qb_dir: Path):
    sys.path.insert(0, str(qb_dir))
    from qbanki.normalize import parse_answerline, strip_diacritics, topic_key  # noqa
    return parse_answerline, strip_diacritics, topic_key


def fold(text: str, strip_diacritics) -> str:
    return " ".join(words(strip_diacritics(text)))


def contains_phrase(haystack: str, needle: str) -> bool:
    if not needle or len(needle) < 4:
        return False
    return re.search(r"(?:^| )" + re.escape(needle) + r"(?: |$)", haystack) is not None


def clean_display(plain: str) -> str:
    """Head of a plain answerline, minus brackets and parentheticals."""
    head = re.split(r"\s*[\[<]", plain, maxsplit=1)[0]
    head = re.sub(r"\s*\([^)]*\)", "", head)
    head = re.sub(r"\s*[\"“”]\s*", " ", head)
    return re.sub(r"\s+", " ", head).strip(" ,;:.")


def letters_hint(answer: str) -> str:
    """'Dien Bien Phu' -> 'D _ _ _   B _ _ _   P _ _'."""
    out = []
    for word in answer.split():
        chars = [ch for ch in word]
        shown = []
        first = True
        for ch in chars:
            if ch.isalnum():
                shown.append(ch.upper() if first else "_")
                first = False
            else:
                shown.append(ch)
        out.append(" ".join(shown))
    return "   ".join(out)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--qb-dir", default="../qb-curricula")
    ap.add_argument("--out", default="data/ladder")
    ap.add_argument("--days", type=int, default=DAYS)
    ap.add_argument("--start", default=START_DATE)
    ap.add_argument("--preview", type=int, default=0,
                    help="print this many ladders instead of writing files")
    args = ap.parse_args()

    qb_dir = Path(args.qb_dir).resolve()
    parse_answerline, strip_diacritics, topic_key = load_qb(qb_dir)
    db = sqlite3.connect(qb_dir / "qb.sqlite")
    db.row_factory = sqlite3.Row

    # --- raw bonuses (HTML answerlines, difficulty modifiers) ---------------
    raw: dict[str, dict] = {}
    with (qb_dir / "sample.jsonl").open(encoding="utf-8") as fh:
        for line in fh:
            doc = json.loads(line)
            if "parts" in doc:
                raw[str(doc["_id"])] = doc

    # --- Matt's model: tags, aliases, importance ----------------------------
    alias = dict(db.execute("SELECT topic_key, canonical_key FROM topic_aliases"))
    tags: dict[str, list[str]] = {}
    for key, path in db.execute("SELECT topic_key, path FROM topic_tags WHERE rank = 0"):
        tags[key] = json.loads(path)
    score = dict(db.execute("SELECT canonical_key, score FROM topic_scores"))

    def canon(answer: str) -> str:
        k = topic_key(answer)
        return alias.get(k, k)

    def path_of(answer: str) -> list[str] | None:
        k = topic_key(answer)
        return tags.get(k) or tags.get(alias.get(k, ""))

    # --- tossup clues per answer (for the "Extra clue" lifeline) ------------
    clues_by_topic: dict[str, list[tuple[float, str, str]]] = defaultdict(list)
    for row in db.execute(
            """SELECT c.text, c.depth, q.answer_primary, q.id FROM clues c
               JOIN questions q ON q.id = c.question_id
               WHERE c.source = 'tossup' AND q.kind = 'tossup'"""):
        clues_by_topic[canon(row["answer_primary"])].append(
            (row["depth"] or 0.0, row["text"], row["id"]))

    # --- candidate bonus parts ----------------------------------------------
    parts_by_bonus: dict[str, list[sqlite3.Row]] = defaultdict(list)
    for row in db.execute(
            """SELECT q.*, s.name AS set_name, s.year AS set_year FROM questions q
               LEFT JOIN sets s ON s.id = q.set_id
               WHERE q.kind = 'bonus_part' AND q.difficulty > 0"""):
        parts_by_bonus[row["id"].split(":")[0]].append(row)

    candidates: list[dict] = []
    rejected = defaultdict(int)
    for bonus_id, rows in parts_by_bonus.items():
        doc = raw.get(bonus_id)
        if not doc:
            rejected["no raw"] += 1
            continue
        answers_html = doc.get("answers") or []
        mods = doc.get("difficultyModifiers") or []
        folded_answers = {}
        for r in rows:
            folded_answers[r["part_index"]] = fold(r["answer_primary"], strip_diacritics)
        # Importance rank within the bonus stands in for e/m/h when missing.
        ranked = sorted(rows, key=lambda r: -score.get(canon(r["answer_primary"]), 0))
        imp_offset = {}
        if len(ranked) == 3:
            for off, r in zip((-0.5, 0.0, 0.5), ranked):
                imp_offset[r["part_index"]] = off
        for r in rows:
            idx = r["part_index"]
            text = MARKER.sub("", r["text"]).strip()
            answer_html = answers_html[idx] if idx < len(answers_html) else ""
            plain = (doc.get("answers_sanitized") or [""] * 3)
            plain = plain[idx] if idx < len(plain) else ""
            parsed = parse_answerline(answer_html, "")
            display = clean_display(plain) or parsed.primary or r["answer_primary"]
            required = " ".join(parsed.required).strip() if parsed.required else display
            # Matt's parser can stop at a parenthesis ("Michael (Stanley)
            # Dukakis" -> "Michael"), which also mis-tags the topic. Only trust
            # the tag when both readings of the answer agree.
            path = path_of(r["answer_primary"])
            agree = topic_key(display) == topic_key(r["answer_primary"])
            if not agree:
                path = path_of(display)
            why = None
            if not path or path[0] == "Other":
                why = "untagged" if agree else "parse mismatch"
            elif not answer_html or not (40 <= len(text) <= 420):
                why = "length"
            elif len(display) > 45 or len(display.split()) > 6:
                why = "long answer"
            elif (MULTI_ANSWER.search(text) or BAD_ANSWERLINE.search(answer_html)
                  or BAD_ANSWERLINE.search(text)):
                why = "multi/description"
            elif DATED.search(text) or (idx == 0 and DATED.search(r["leadin"] or "")):
                why = "dated"
            elif idx > 0 and (DEPENDENT_START.match(text) or DEPENDENT_ANYWHERE.search(text)):
                why = "dependent"
            if why is None and idx > 0:
                # "Gordon died in the siege..." -- opens on a name the leadin or
                # another part introduced.
                m = re.match(r"([A-Z][A-Za-z\-]{2,})(?:'s)?\b", text)
                if m and m.group(1) not in {"The", "This", "These", "Name", "Identify",
                                            "Give", "For", "In", "On", "At", "During",
                                            "After", "Before", "What", "Which", "One",
                                            "Its", "Some", "Many", "Most", "When"}:
                    context = (doc.get("leadin_sanitized") or "") + " " + " ".join(
                        p for i, p in enumerate(doc.get("parts_sanitized") or []) if i != idx)
                    if re.search(r"\b" + re.escape(m.group(1)) + r"\b", context):
                        why = "dependent"
            if why is None:
                ftext = fold(text, strip_diacritics)
                if contains_phrase(ftext, fold(required, strip_diacritics)):
                    why = "giveaway"
                elif any(contains_phrase(ftext, a) for i, a in folded_answers.items() if i != idx):
                    why = "dependent"
            if why:
                rejected[why] += 1
                continue

            leadin = LEADIN_NUMBER.sub("", (r["leadin"] or "")).strip()
            if leadin:
                leadin = leadin[0].upper() + leadin[1:]
                if not leadin.endswith((".", "?", "!", "\"", "”")):
                    leadin += "."
                # Part 0's leadin is usually a clue for it; for later parts it
                # is only safe as context when it is generic.
                if idx > 0 and not GENERIC_LEADIN.match(leadin):
                    leadin = ""
                if idx > 0 and leadin and (DEPENDENT_ANYWHERE.search(leadin)):
                    leadin = ""

            eff = float(r["difficulty"])
            if idx < len(mods) and mods[idx] in MODIFIER_OFFSET:
                eff += MODIFIER_OFFSET[mods[idx]]
            else:
                eff += imp_offset.get(idx, 0.0)

            candidates.append({
                "id": r["id"],
                "bonus": bonus_id,
                "path": path,
                "canon": canon(r["answer_primary"]),
                "difficulty": int(r["difficulty"]),
                "effective": eff,
                "importance": score.get(canon(r["answer_primary"]), 0),
                "leadin": leadin,
                "text": text,
                "answerHtml": answer_html,
                "answer": display,
                "required": required,
                "set": r["set_name"] or "",
                "year": r["set_year"],
                "subcategory": r["subcategory"] or "",
            })

    print(f"{len(candidates):,} usable bonus parts; rejected {dict(rejected)}",
          file=sys.stderr)

    # --- pools per topic ----------------------------------------------------
    pools: dict[str, list[dict]] = {}
    for prefix, label in TOPICS.items():
        parts = prefix.split("/")
        label_words = set(words(label)) | {w for p in parts for w in words(p)}
        pool = []
        for c in candidates:
            if c["path"][:len(parts)] != parts:
                continue
            # The topic's own name is a giveaway answer ("Egypt" in Ancient Egypt).
            if set(words(c["answer"])) <= label_words:
                continue
            pool.append(c)
        if len(pool) >= MIN_POOL:
            pools[prefix] = pool
        else:
            print(f"  skip {prefix}: only {len(pool)} parts", file=sys.stderr)
    print(f"{len(pools)} daily topics", file=sys.stderr)

    rng = random.Random(SEED)
    start = dt.date.fromisoformat(args.start)
    last_topic_day: dict[str, int] = {}
    last_part_day: dict[str, int] = {}
    last_answer_day: dict[str, int] = {}

    by_canon: dict[str, list[dict]] = defaultdict(list)
    for c in candidates:
        by_canon[c["canon"]].append(c)

    def pick_clue(c: dict) -> str | None:
        options = []
        req = fold(c["required"], strip_diacritics)
        ans = fold(c["answer"], strip_diacritics)
        for depth, text, qid in clues_by_topic.get(c["canon"], []):
            if not (50 <= len(text) <= 260):
                continue
            ft = fold(text, strip_diacritics)
            if contains_phrase(ft, req) or contains_phrase(ft, ans):
                continue
            if re.search(r"\b(?:for (?:10|ten) points|name this|identify this)\b", text, re.I):
                continue
            if DEPENDENT_CLUE.search(text) or DEPENDENT_ANYWHERE.search(text) or DATED.search(text):
                continue
            # Prefer the middle-to-late (more familiar) clues of a tossup.
            options.append((abs(depth - 0.7), rng.random(), text))
        if not options:
            # Fall back on another bonus part with the same answer.
            for other in by_canon.get(c["canon"], []):
                if other["bonus"] == c["bonus"] or DATED.search(other["text"]):
                    continue
                ft = fold(other["text"], strip_diacritics)
                if contains_phrase(ft, req) or contains_phrase(ft, ans):
                    continue
                t = re.sub(r"^(?:Name|Identify|Give) (?:this|these)\b", "This", other["text"])
                options.append((abs(other["difficulty"] - c["difficulty"] + 2), rng.random(), t))
        if not options:
            return None
        options.sort()
        return options[0][2]

    def public(c: dict) -> dict:
        return {
            "id": c["id"],
            "leadin": c["leadin"],
            "text": c["text"],
            "answerHtml": c["answerHtml"],
            "answer": c["answer"],
            "letters": letters_hint(c["required"]),
            "clue": pick_clue(c),
            "difficulty": c["difficulty"],
            "set": c["set"],
            "year": c["year"],
        }

    def build_ladder(topic: str, pool: list[dict]):
        used_canon: set[str] = set()
        used_bonus: set[str] = set()
        used_sub: dict[str, int] = defaultdict(int)
        rungs = []
        for target in TARGETS:
            best = []
            for c in pool:
                if c["canon"] in used_canon or c["bonus"] in used_bonus:
                    continue
                gap = abs(c["effective"] - target)
                if gap > 1.6:
                    continue
                sub = "/".join(c["path"][:len(topic.split("/")) + 1])
                # Easy rungs lean on famous answers, hard rungs on obscure ones.
                fame = math.log1p(c["importance"]) / 8.0
                fame_term = -fame if target <= 5 else fame * 0.5
                cost = gap + 0.45 * used_sub[sub] + 0.35 * fame_term + rng.random() * 0.5
                best.append((cost, sub, c))
            if len(best) < 2:
                break
            best.sort(key=lambda b: b[0])
            _, sub, main_q = best[0]
            used_sub[sub] += 1
            used_canon.add(main_q["canon"])
            used_bonus.add(main_q["bonus"])
            swap = next((b[2] for b in best[1:]
                         if b[2]["canon"] not in used_canon
                         and b[2]["bonus"] not in used_bonus), None)
            if swap is None:
                break
            used_canon.add(swap["canon"])
            used_bonus.add(swap["bonus"])
            level = max(1, min(10, round(target)))
            rungs.append({
                "rung": len(rungs) + 1,
                "level": DIFFICULTY_LABELS[level],
                "question": public(main_q),
                "swap": public(swap),
            })
        return rungs, used_canon

    index = []
    out_dir = Path(args.out)
    days_dir = out_dir / "days"
    if not args.preview:
        days_dir.mkdir(parents=True, exist_ok=True)

    total = args.preview or args.days
    for n in range(1, total + 1):
        day = start + dt.timedelta(days=n - 1)
        eligible = [t for t in pools if n - last_topic_day.get(t, -10**6) > REPEAT_GAP]
        rungs: list[dict] = []
        used_canon: set[str] = set()
        pool: list[dict] = []
        while eligible:
            # Weight towards big pools a little, so US/Britain come up more often.
            weights = [math.sqrt(len(pools[t])) for t in eligible]
            topic = rng.choices(eligible, weights=weights)[0]
            eligible.remove(topic)
            pool = [c for c in pools[topic]
                    if n - last_part_day.get(c["id"], -10**6) > QUESTION_REUSE_GAP
                    and n - last_answer_day.get(c["canon"], -10**6) > 30]
            rungs, used_canon = build_ladder(topic, pool)
            if len(rungs) == RUNGS:
                break
        else:
            raise SystemExit(f"day {n}: no topic can fill {RUNGS} rungs")
        last_topic_day[topic] = n
        for r in rungs:
            for q in (r["question"], r["swap"]):
                last_part_day[q["id"]] = n
        for c in pool:
            if c["canon"] in used_canon:
                last_answer_day[c["canon"]] = n

        ladder = {
            "number": n,
            "date": day.isoformat(),
            "topic": TOPICS[topic],
            "path": topic,
            "rungs": rungs,
        }
        index.append({"number": n, "date": day.isoformat(), "topic": TOPICS[topic],
                      "rungs": len(rungs)})
        if args.preview:
            print(f"\n#{n} {day} — {TOPICS[topic]}")
            for r in rungs:
                q = r["question"]
                print(f"  {r['rung']:>2}. [{r['level']}, d{q['difficulty']}] "
                      f"{(q['leadin'] + ' ') if q['leadin'] else ''}{q['text']}")
                print(f"      -> {q['answer']}   ({q['set']})")
        else:
            (days_dir / f"{n}.json").write_text(
                json.dumps(ladder, ensure_ascii=False, separators=(",", ":")),
                encoding="utf-8")

    if not args.preview:
        (out_dir / "index.json").write_text(json.dumps({
            "start": args.start, "days": len(index),
            "generated": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
            "source": "QB Reader (qbreader.org), tagged by QB-curricula",
            "ladders": index,
        }, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"wrote {len(index)} ladders to {days_dir}", file=sys.stderr)


if __name__ == "__main__":
    main()

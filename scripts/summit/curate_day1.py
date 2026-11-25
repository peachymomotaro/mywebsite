#!/usr/bin/env python3
"""Hand-curated Summit No. 1 (The papacy): plain-English questions, hand-ordered.

The generated climb for day 1 had quizbowl wording ("Name these other
popes...") and an order driven by tournament level, which put "papal
conclave" at the summit. This rewrites each question as a natural quiz
question and orders them by how hard they are for a well-read player.

Rules followed in the rewrites: every fact comes from the original QB Reader
question (or its own extra clue); nothing refers to another question; the
answer never appears in its question. Original IDs, answerlines and sets are
kept, so credit and marking are unchanged, except that the Hospitallers
answerline also accepts the order's other names, which the original
question gave as its own facts.

Writes data/summit/curated/1.json; the API serves a curated day in place of
the generated one.
"""

import json
import re
from pathlib import Path

SRC = [Path("data/summit/days/1.json"), Path("data/summit/days/27.json")]
OUT = Path("data/summit/curated/1.json")

# answer -> (rewritten question, rewritten guide clue)
REWRITES = {
    "Pope": (
        "Three members of the Medici family went on to hold which office in Rome, "
        "taking the names Leo X, Clement VII and Leo XI?",
        "The last Englishman to hold it was Nicholas Breakspear."),
    "Jesuits": (
        "Which Catholic religious order, founded by Ignatius Loyola and nicknamed "
        "“God’s Marines”, counted the missionary Francis Xavier among its members?",
        "Two of its members prepared the translation of the Treaty of Nerchinsk."),
    "Pope John Paul II": (
        "Which pope founded World Youth Day in 1985? His visit to his home country "
        "helped inspire the Solidarity movement, which went on to end communist rule there.",
        "He visited Mehmet Ali Agca in prison to forgive him for trying to kill him."),
    "Pope Benedict XVI": (
        "In 2013, which pope became the first since 1294 to resign?",
        "Critics called him “the pope of aesthetics” for his lavish dress, and he had "
        "been conscripted into Germany’s military in the Second World War."),
    "papal conclave": (
        "What name is given to the meeting in which the College of Cardinals is shut away "
        "in the Vatican to choose a pope, its name referring to being locked in “with a key”?",
        "Since 1996 the cardinals taking part have stayed in Saint Martha’s House "
        "rather than on rented cots behind cloth partitions."),
    "Knights Templar": (
        "Which order of knights first based itself at the Al-Aqsa Mosque in Jerusalem, and was "
        "dissolved by the pope in the early 14th century after Philip IV of France accused it "
        "of fraud and heresy?",
        "After winning the Battle of Hattin, Saladin bought and executed its members en masse."),
    "Pope Urban II": (
        "Which pope launched the First Crusade at the Council of Clermont, offering remission "
        "of sins to those who joined and supposedly declaring “Deus vult” – "
        "“God wills it”?",
        "He allied himself with Roger I of Sicily and was heavily influenced by a delegation "
        "from Alexios I Komnenos."),
    "Avignon": (
        "During the 14th century a series of popes lived in which city in the south of "
        "modern-day France?",
        "Six papal elections were held in its Palais des Papes."),
    "Pope Pius XII": (
        "Which pope, who led the Church during the Second World War, has been called "
        "“Hitler’s Pope” for not doing enough to stop the Holocaust?",
        "At his trial, Karl Wolff testified that he had been ordered to kidnap this pope."),
    "Knights Hospitallers": (
        "Which order of crusading knights captured the island of Rhodes from the Byzantines "
        "and made it their base, and still exists today?",
        "Founded by the Blessed Gerard, it held the fortresses of Margat and Krak des Chevaliers "
        "before being forced from the Holy Land."),
    "Babylonian Captivity": (
        "The period when the popes lived at Avignon is sometimes called by what name, borrowed "
        "from the exile of the Jews from Judah begun by Nebuchadnezzar and ended by Cyrus the Great?",
        "The name refers to a period of exile in the Old Testament."),
    "Gregory XIII": (
        "Born Ugo Buoncompagni, which pope called for Queen Elizabeth I to be deposed, but is "
        "better remembered for the calendar named after him?",
        "He had Aloysius Lilius and Christopher Clavius design the system, and brought it in "
        "with the bull Inter gravissimas."),
    "Council of Constance": (
        "Which church council elected Pope Martin V, ending the Western Schism, and had the "
        "theologian Jan Hus burned at the stake?",
        "It was called by Emperor Sigismund, and it canonized St Bridget of Sweden."),
    "Clement V": (
        "Which pope moved the papacy to Avignon and suppressed the Knights Templar at the "
        "Council of Vienne?",
        "He rescinded an earlier papal bull which proclaimed that there is no salvation outside "
        "the Church."),
    "Pope Gregory XI": (
        "Persuaded by St Catherine of Siena, which pope moved the papacy back to Rome?",
        "He hired John Hawkwood to fight on his behalf in the War of the Eight Saints."),
    "Council of Pisa": (
        "Which church council of 1409 tried and failed to end the Western Schism, and was "
        "superseded by a later council?",
        "It elected Philargi as Alexander V, but both rival popes refused to recognise it."),
    "Urban VI": (
        "Which 14th-century pope, opposed by the antipope Clement VII during the Western Schism, "
        "once complained that he couldn’t hear enough screaming while rebellious cardinals "
        "were being tortured?",
        "He probably died of injuries from a painful fall from his mule at Narni."),
    "Cadaver Synod": (
        "What grim name is given to the event at which Pope Stephen VI put the rotting corpse "
        "of his predecessor Formosus on trial, then had it thrown into the Tiber?",
        "Held in 897, it grew out of tension between Spoletan and Roman factions over whether "
        "Arnulf or Lambert should be Holy Roman Emperor."),
    "Sylvester II": (
        "Which pope, introduced to Arabic numerals while studying at a Catalonian monastery, "
        "is credited with reintroducing the abacus and the armillary sphere to Europe?",
        "The first French pope, he took his name from the pope said by the forged Donation of "
        "Constantine to have been given power over the Western Roman Empire."),
    "Pope Innocent IV": (
        "Which pope, elected after an 18-month vacancy following Celestine IV, called the "
        "Council of Lyons that excommunicated Holy Roman Emperor Frederick II?",
        "He enticed Henry III to take the throne of Sicily."),
}

# No question or clue may name a later camp's answer (checked in main()).

# Camp order: (main, swap), easiest first.
ORDER = [
    ("Pope", "Jesuits"),
    ("Pope John Paul II", "Pope Benedict XVI"),
    ("papal conclave", "Knights Templar"),
    ("Pope Urban II", "Avignon"),
    ("Pope Pius XII", "Knights Hospitallers"),
    ("Babylonian Captivity", "Gregory XIII"),
    ("Council of Constance", "Clement V"),
    ("Pope Gregory XI", "Council of Pisa"),
    ("Urban VI", "Cadaver Synod"),
    ("Sylvester II", "Pope Innocent IV"),
]

LEVELS = ["Anyone", "Well known", "Well known", "General knowledge", "General knowledge",
          "Keen", "Keen", "History buff", "Specialist", "Serious quizzer"]


def main() -> None:
    pool = {}
    for path in SRC:
        day = json.loads(path.read_text(encoding="utf-8"))
        for rung in day["rungs"]:
            for q in (rung["question"], rung["swap"]):
                pool.setdefault(q["answer"], q)
    missing = [a for pair in ORDER for a in pair if a not in pool]
    if missing:
        raise SystemExit(f"not found: {missing}")

    def rewrite(answer: str) -> dict:
        q = dict(pool[answer])
        text, clue = REWRITES[answer]
        assert answer.lower() not in text.lower(), answer
        q["leadin"] = ""
        q["text"] = text
        q["clue"] = clue
        if answer == "Knights Hospitallers":
            q["answerHtml"] = ("<b><u>Knights Hospitaller</u></b>s [or <b><u>Hospitaller</u></b>s; "
                               "or Knights of <b><u>St John</u></b>; or Order of <b><u>St John</u></b>; "
                               "or Knights of <b><u>Malta</u></b>]")
        return q

    # Nothing may give away a later camp's answer, in a question or a clue.
    for i, pair in enumerate(ORDER):
        for answer in pair:
            text = " ".join(REWRITES[answer]).lower()
            for later in (a for p in ORDER[i + 1:] for a in p):
                core = later.lower().replace("pope ", "")
                if re.search(r"\b" + re.escape(core) + r"\b", text):
                    raise SystemExit(f"{answer!r} gives away later answer {later!r}")

    base = json.loads(SRC[0].read_text(encoding="utf-8"))
    climb = {
        "number": 1,
        "date": base["date"],
        "topic": base["topic"],
        "path": base["path"],
        "curated": True,
        "rungs": [
            {"rung": i + 1, "level": LEVELS[i], "question": rewrite(main), "swap": rewrite(swap)}
            for i, (main, swap) in enumerate(ORDER)
        ],
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(climb, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()

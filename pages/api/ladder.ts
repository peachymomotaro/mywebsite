import fs from "fs/promises";
import path from "path";
import type { NextApiRequest, NextApiResponse } from "next";
import { isIsoDate, ladderFor, latestAllowedDate } from "@/lib/ladder/daily";

const DATA_DIR = path.join(process.cwd(), "data", "ladder");

type Index = { start: string; days: number };
let indexCache: Index | null = null;

async function readIndex(): Promise<Index> {
  if (!indexCache) {
    const raw = JSON.parse(await fs.readFile(path.join(DATA_DIR, "index.json"), "utf8"));
    indexCache = { start: raw.start, days: raw.days };
  }
  return indexCache;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed." });
  }

  const date = Array.isArray(req.query.date) ? req.query.date[0] : req.query.date;
  if (!isIsoDate(date)) {
    return res.status(400).json({ error: "Give a date as YYYY-MM-DD." });
  }
  if (date > latestAllowedDate()) {
    return res.status(403).json({ error: "No peeking: that ladder isn't up yet." });
  }

  const index = await readIndex();
  const slot = ladderFor(date, index.start, index.days);
  if (!slot) {
    return res.status(404).json({ error: `Ladder starts on ${index.start}.`, start: index.start });
  }

  const ladder = JSON.parse(
    await fs.readFile(path.join(DATA_DIR, "days", `${slot.file}.json`), "utf8"));
  ladder.number = slot.number;
  ladder.date = date;

  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  return res.status(200).json(ladder);
}

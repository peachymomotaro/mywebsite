import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { judge } from "@/lib/summit/marking";

const climb = JSON.parse(readFileSync(path.join(process.cwd(), "data/summit/curated/1.json"), "utf8"));
const byAnswer = new Map<string, string>();
for (const rung of climb.rungs) {
  for (const q of [rung.question, rung.swap]) byAnswer.set(q.answer, q.answerHtml);
}

// What a player would naturally type for each curated answer.
const cases: [string, string, "accept" | "prompt"][] = [
  ["Pope", "pope", "accept"], ["Pope", "the papacy", "accept"],
  ["Jesuits", "jesuits", "accept"], ["Jesuits", "society of jesus", "accept"],
  ["Pope John Paul II", "john paul ii", "accept"], ["Pope John Paul II", "john paul 2", "accept"],
  ["Pope Benedict XVI", "benedict xvi", "accept"], ["Pope Benedict XVI", "benedict 16", "accept"],
  ["Pope Benedict XVI", "benedict", "prompt"],
  ["papal conclave", "conclave", "accept"], ["papal conclave", "a conclave", "accept"],
  ["Knights Templar", "templars", "accept"], ["Knights Templar", "the knights templar", "accept"],
  ["Pope Urban II", "urban ii", "accept"], ["Pope Urban II", "urban 2", "accept"],
  ["Avignon", "avignon", "accept"], ["Avignon", "avingon", "accept"],
  ["Pope Pius XII", "pius xii", "accept"], ["Pope Pius XII", "pius 12", "accept"],
  ["Knights Hospitallers", "hospitallers", "accept"], ["Knights Hospitallers", "knights of malta", "accept"],
  ["Knights Hospitallers", "knights of st john", "accept"],
  ["Babylonian Captivity", "babylonian captivity", "accept"], ["Babylonian Captivity", "captivity", "prompt"],
  ["Gregory XIII", "gregory xiii", "accept"], ["Gregory XIII", "gregory 13", "accept"],
  ["Council of Constance", "constance", "accept"], ["Council of Constance", "council of constance", "accept"],
  ["Clement V", "clement v", "accept"], ["Clement V", "clement 5", "accept"],
  ["Pope Gregory XI", "gregory xi", "accept"], ["Pope Gregory XI", "gregory 11", "accept"],
  ["Pope Gregory XI", "gregory", "prompt"],
  ["Council of Pisa", "pisa", "accept"], ["Council of Pisa", "council of pisa", "accept"],
  ["Urban VI", "urban vi", "accept"], ["Urban VI", "urban 6", "accept"],
  ["Cadaver Synod", "cadaver synod", "accept"],
  ["Sylvester II", "sylvester ii", "accept"], ["Sylvester II", "sylvester 2", "accept"],
  ["Pope Innocent IV", "innocent iv", "accept"], ["Pope Innocent IV", "innocent 4", "accept"],
];

describe("Summit No. 1 accepts natural answers", () => {
  it.each(cases)("%s / %s -> %s", (answer, guess, verdict) => {
    expect(byAnswer.has(answer)).toBe(true);
    expect(judge(byAnswer.get(answer)!, guess)).toBe(verdict);
  });

  it("rejects wrong numerals", () => {
    expect(judge(byAnswer.get("Pope Gregory XI")!, "gregory xiii")).toBe("reject");
    expect(judge(byAnswer.get("Urban VI")!, "urban ii")).toBe("reject");
  });
});

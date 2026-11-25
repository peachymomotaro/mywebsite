import { describe, expect, it } from "vitest";
import { answerForms, judge } from "@/lib/ladder/marking";

describe("Ladder marking", () => {
  const cases: [string, string, string][] = [
    ["<b><u>Battle of Dien Bien Phu</u></b>", "dien bien phu", "accept"],
    ["<b><u>Battle of Dien Bien Phu</u></b>", "Dien Bein Phu", "accept"],
    ['<b><u>North Vietnam</u></b> (do not accept "Vietnam")', "nroth vietnam", "accept"],
    ['<b><u>North Vietnam</u></b> (do not accept "Vietnam")', "vietnam", "reject"],
    ["Michael (Stanley) <b><u>Dukakis</u></b>", "dukakis", "accept"],
    ["<b><u>Republic of Turkey</u></b>", "Turkey", "accept"],
    ["<b><u>Charles II</u></b>", "charles i", "reject"],
    ["<b><u>Henry VIII</u></b>", "henry vii", "reject"],
    ["<b><u>World War II</u></b>", "world war 1", "reject"],
    ["Pope <b><u>Urban II</u></b> [prompt on <b><u>Urban</u></b>]", "urban", "prompt"],
    ["<b><u>Kievan Rus</u></b> [prompt on Kiev; prompt on Rus]", "kievan russ", "accept"],
    ["<b><u>Safavid Empire</u></b> [prompt on Iran or Persia]", "safavids", "accept"],
    ["<b><u>NAACP</u></b> [or National Association for the Advancement of Colored People]",
      "national association for the advancement of colored people", "accept"],
    ["<b><u>Huguenots</u></b>", "Hugenots", "accept"],
    ["<b><u>Cairo</u></b>", "Cairns", "reject"],
    ["<b><u>Ashanti</u></b> Kingdom [or <b><u>Asante</u></b>]", "asante", "accept"],
    ["<b><u>Ashanti</u></b> Kingdom [or <b><u>Asante</u></b>]", "zulu", "reject"],
    ["<b><u>Iran</u></b>", "Iraq", "reject"],
    ["<b><u>Mali</u></b> Empire", "bali", "reject"],
    ["<b><u>Battle of Sedan</u></b>", "", "reject"],
    // Part of the answer earns a prompt, not a fall.
    ["<b><u>Babylonian Captivity</u></b>", "captivity", "prompt"],
    ["<b><u>Babylonian Captivity</u></b>", "babylonian", "prompt"],
    ["<b><u>Babylonian Captivity</u></b>", "babylonain captivity", "accept"],
    ["<b><u>Charles II</u></b>", "charles", "prompt"],
    ["<b><u>Charles II</u></b>", "charles iii", "reject"],
    ["<b><u>Compromise of 1850</u></b>", "compromise", "prompt"],
    ["<b><u>Battle of Dien Bien Phu</u></b>", "battle", "reject"],
    ["<b><u>Battle of Dien Bien Phu</u></b>", "phu", "prompt"],
  ];

  it.each(cases)("%s / %s -> %s", (answer, guess, verdict) => {
    expect(judge(answer, guess)).toBe(verdict);
  });

  it("reads alternates and rejects from the answerline", () => {
    const forms = answerForms(
      '<b><u>North Vietnam</u></b> [or <b><u>DRV</u></b>; do not accept "Vietnam"]');
    expect(forms.accept).toContain("DRV");
    expect(forms.reject).toContain("Vietnam");
  });
});

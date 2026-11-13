// @vitest-environment node
import { describe, expect, it } from "vitest";
import { itemsFromSuggestedAction, readChecklist, safeChecklistUrl } from "@/lib/pops/checklist";

describe("POps personal checklist", () => {
  it("imports linked bullets from an existing recommended next step", () => {
    const source = [
      "- [Aristotle, *Nicomachean Ethics* II.1](https://classics.mit.edu/Aristotle/nicomachaen.2.ii.html) — habituation and character.",
      "- [William James, *Principles of Psychology*](https://www.yorku.ca/pclassic/James/Principles/prin4.htm) — habits.",
      "- [Gardner et al. (2024)](https://compass.onlinelibrary.wiley.com/doi/10.1111/spc3.12975) — constraints.",
    ].join("\n");
    const items = itemsFromSuggestedAction(source);
    expect(items).toHaveLength(3);
    expect(items[0]).toEqual({
      title: "Aristotle, Nicomachean Ethics II.1 — habituation and character.",
      url: "https://classics.mit.edu/Aristotle/nicomachaen.2.ii.html",
    });
    expect(items[2].url).toBe("https://compass.onlinelibrary.wiley.com/doi/10.1111/spc3.12975");
  });

  it("does not turn prose or agent instructions into checklist items", () => {
    expect(itemsFromSuggestedAction("Hand this to an agent and run the CI checks.")).toEqual([]);
  });

  it("does not expose unsafe schemes through persisted checklist content", () => {
    expect(safeChecklistUrl("javascript:alert(1)")).toBeNull();
    expect(safeChecklistUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    const saved = readChecklist([{ id: "1", title: "Safe title", done: false, url: "javascript:alert(1)" }]);
    expect(saved).toEqual([{ id: "1", title: "Safe title", done: false, url: null }]);
  });

  it("ignores malformed persisted objects and keeps checked state", () => {
    expect(readChecklist([{ id: "x", title: "Read", url: null, done: true }, { title: "No id" }, null]))
      .toEqual([{ id: "x", title: "Read", url: null, done: true }]);
  });
});

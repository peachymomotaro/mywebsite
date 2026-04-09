import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Reading River theme stylesheet", () => {
  it("defines the refreshed Coolors palette and homepage action variants", () => {
    const stylesheet = readFileSync(
      path.resolve(process.cwd(), "app/reading-river/reading-river.css"),
      "utf8",
    );

    expect(stylesheet).toContain("--river-deep: 197 69% 18%;");
    expect(stylesheet).toContain("--river-teal: 190 49% 36%;");
    expect(stylesheet).toContain("--river-peach: 20 71% 65%;");
    expect(stylesheet).toContain("--river-lilac: 290 29% 68%;");
    expect(stylesheet).toContain("--river-paper: 37 39% 94%;");
    expect(stylesheet).toContain("--background: var(--river-paper);");
    expect(stylesheet).toContain(".river-home-page .river-spotlight-action-primary {");
    expect(stylesheet).toContain(".river-home-page .river-spotlight-action-secondary {");
    expect(stylesheet).toContain(".river-home-page .river-spotlight-action-danger {");
  });
});

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

  it("uses the Reading River artwork as a faint shell background overlay", () => {
    const stylesheet = readFileSync(
      path.resolve(process.cwd(), "app/reading-river/reading-river.css"),
      "utf8",
    );

    expect(stylesheet).toContain(".editorial-shell::before {");
    expect(stylesheet).toContain("background-image: url(\"/ReadingRiverBackground.png\");");
    expect(stylesheet).toContain("opacity: 0.72;");
    expect(stylesheet).toContain("filter: contrast(1.24) saturate(1.12);");
    expect(stylesheet).toContain("z-index: 0;");
    expect(stylesheet).toContain("pointer-events: none;");
    expect(stylesheet).toContain(".editorial-shell-frame > :not(.editorial-shell-rule) {");
    expect(stylesheet).toContain("position: relative;");
    expect(stylesheet).toContain("z-index: 1;");
    expect(stylesheet).toContain(".auth-page {\n  min-height: 100vh;\n  padding: 4rem 1.5rem;\n  background: transparent;");
  });

  it("keeps the preferences panel compact but left aligned", () => {
    const stylesheet = readFileSync(
      path.resolve(process.cwd(), "app/reading-river/reading-river.css"),
      "utf8",
    );

    expect(stylesheet).toContain(".river-preferences-panel {");
    expect(stylesheet).toContain("justify-self: start;");
    expect(stylesheet).toContain("width: min(100%, 45rem);");
    expect(stylesheet).toContain(".river-preferences-choice {");
    expect(stylesheet).toContain("justify-content: flex-start;");
    expect(stylesheet).toContain("text-align: left;");
    expect(stylesheet).toContain("width: min(100%, 39rem);");
    expect(stylesheet).toContain(".river-preferences-description {");
    expect(stylesheet).toContain("white-space: normal;");
    expect(stylesheet).toContain("width: min(100%, 39rem);");
    expect(stylesheet).toContain(".intake-submit-row.river-preferences-submit-row {");
    expect(stylesheet).toContain("justify-content: flex-start;");
  });

  it("pins spotlight card actions and clamps long spotlight titles", () => {
    const stylesheet = readFileSync(
      path.resolve(process.cwd(), "app/reading-river/reading-river.css"),
      "utf8",
    );

    expect(stylesheet).toContain(".river-home-page .river-spotlight-card {");
    expect(stylesheet).toContain("grid-template-rows: auto minmax(0, 1fr);");
    expect(stylesheet).toContain(".river-home-page .river-spotlight-body {");
    expect(stylesheet).toContain("display: flex;");
    expect(stylesheet).toContain("flex-direction: column;");
    expect(stylesheet).toContain("height: 100%;");
    expect(stylesheet).toContain(".river-home-page .river-spotlight-body-copy {");
    expect(stylesheet).toContain(".river-home-page .river-spotlight-body-actions {");
    expect(stylesheet).toContain("margin-top: auto;");
    expect(stylesheet).toContain(".river-home-page .river-spotlight-title-clamp {");
    expect(stylesheet).toContain("display: -webkit-box;");
    expect(stylesheet).toContain("-webkit-line-clamp: 2;");
    expect(stylesheet).toContain("-webkit-box-orient: vertical;");
    expect(stylesheet).toContain("overflow: hidden;");
  });
});

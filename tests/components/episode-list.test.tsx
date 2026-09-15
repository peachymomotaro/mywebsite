import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
// @ts-expect-error -- the legacy component is JavaScript without declarations.
import EpisodeList from "@/components/EpisodeList";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("EpisodeList", () => {
  it("renders episodes that share an archive URL without duplicate-key warnings", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <EpisodeList
        episodes={[
          {
            title: "First episode",
            date: "Jan 1, 2020",
            url: "https://example.com/archive/page/3/",
          },
          {
            title: "Second episode",
            date: "Jan 2, 2020",
            url: "https://example.com/archive/page/3/",
          },
        ]}
      />
    );

    expect(screen.getByRole("link", { name: "First episode" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Second episode" })).toBeInTheDocument();
    expect(consoleError).not.toHaveBeenCalled();
  });
});

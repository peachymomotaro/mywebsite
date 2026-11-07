import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GladeSheet, type SheetItem } from "@/components/reading-river/glade-sheet";
import { updateReadingItem } from "@/app/reading-river/actions/reading-items";

vi.mock("@/app/reading-river/actions/reading-items", () => ({
  updateReadingItem: vi.fn(async () => ({})),
}));

const linkedItem: SheetItem = {
  id: "item-1",
  title: "A paper to read",
  sourceUrl: "https://example.com/paper",
  siteName: "Example",
  estimatedMinutes: 20,
};

function setup(place: "river" | "eddies", item = linkedItem) {
  const handlers = {
    onStart: vi.fn(),
    onFinish: vi.fn(),
    onRemove: vi.fn(),
    onEdited: vi.fn(),
  };
  render(<GladeSheet item={item} place={place} {...handlers} />);
  return handlers;
}

describe("GladeSheet reading flow", () => {
  it("starts reading from the river without offering Finished", () => {
    const handlers = setup("river");
    const start = screen.getByRole("link", { name: "Start reading" });
    expect(start).toHaveAttribute("href", linkedItem.sourceUrl);
    expect(start).toHaveAttribute("target", "_blank");
    expect(screen.queryByRole("button", { name: "Finished" })).not.toBeInTheDocument();
    fireEvent.click(start);
    expect(handlers.onStart).toHaveBeenCalledWith(linkedItem);
    expect(handlers.onFinish).not.toHaveBeenCalled();
  });

  it("allows finishing only from the eddies", () => {
    const handlers = setup("eddies");
    expect(screen.getByRole("link", { name: "Continue" })).toHaveAttribute("href", linkedItem.sourceUrl);
    fireEvent.click(screen.getByRole("button", { name: "Finished" }));
    expect(handlers.onFinish).toHaveBeenCalledWith(linkedItem);
  });

  it("lets a river article with a missing link be repaired, not falsely finished", async () => {
    const handlers = setup("river", { ...linkedItem, sourceUrl: null });
    expect(screen.queryByRole("button", { name: "Finished" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Start reading" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Add article link to start reading/i }));
    fireEvent.change(screen.getByRole("textbox", { name: "Article link" }), {
      target: { value: "https://example.com/recovered" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save link" }));
    expect(handlers.onEdited).toHaveBeenCalledWith("item-1", {
      sourceUrl: "https://example.com/recovered",
    });
    await waitFor(() => expect(updateReadingItem).toHaveBeenCalledWith({
      id: "item-1",
      sourceUrl: "https://example.com/recovered",
    }));
  });
});

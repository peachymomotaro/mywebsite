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

  it("keeps the title and time as plain text until Edit is pressed", () => {
    setup("river");
    expect(screen.queryByRole("button", { name: /Change the title/ })).not.toBeInTheDocument();
    expect(screen.getByText("20 min")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "A paper to read. Change the title" }));
    expect(screen.getByRole("textbox", { name: "Title" })).toHaveValue("A paper to read");

    fireEvent.click(screen.getByRole("button", { name: "Done editing" }));
    expect(screen.queryByRole("textbox", { name: "Title" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Change the title/ })).not.toBeInTheDocument();
  });

  it("asks before letting a piece float away", () => {
    const handlers = setup("river");
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(handlers.onRemove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Let it float away" }));
    expect(handlers.onRemove).toHaveBeenCalledWith(linkedItem);
  });

  it("offers only Done editing while editing in the eddies, never Finished", () => {
    const handlers = setup("eddies");
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.queryByRole("button", { name: "Finished" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Done editing" }));
    expect(screen.getByRole("button", { name: "Finished" })).toBeInTheDocument();
    expect(handlers.onFinish).not.toHaveBeenCalled();
  });
});

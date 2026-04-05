import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  HomeRemoveAction,
  READING_RIVER_SKIP_REMOVE_CONFIRMATION_KEY,
} from "@/components/reading-river/home-remove-action";

describe("HomeRemoveAction", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("asks for confirmation before removing by default", () => {
    const removeAction = vi.fn(async () => {});

    render(<HomeRemoveAction removeAction={removeAction} />);

    expect(screen.queryByText("Are you sure?")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(removeAction).not.toHaveBeenCalled();
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "Don't ask this again in future" }),
    ).toBeInTheDocument();
  });

  it("remembers the opt-out when the reader confirms removal", async () => {
    const removeAction = vi.fn(async () => {});

    render(<HomeRemoveAction removeAction={removeAction} />);

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Don't ask this again in future" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirm remove" }));

    await waitFor(() => {
      expect(removeAction).toHaveBeenCalledTimes(1);
    });

    expect(window.localStorage.getItem(READING_RIVER_SKIP_REMOVE_CONFIRMATION_KEY)).toBe("true");
  });

  it("removes immediately when the reader has already opted out of confirmation", async () => {
    const removeAction = vi.fn(async () => {});
    window.localStorage.setItem(READING_RIVER_SKIP_REMOVE_CONFIRMATION_KEY, "true");

    render(<HomeRemoveAction removeAction={removeAction} />);

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() => {
      expect(removeAction).toHaveBeenCalledTimes(1);
    });

    expect(screen.queryByText("Are you sure?")).not.toBeInTheDocument();
  });
});

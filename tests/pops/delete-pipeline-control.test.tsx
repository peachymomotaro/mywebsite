// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DeletePipelineControl } from "@/components/pops/DeletePipelineControl";

const deletion = vi.hoisted(() => vi.fn(async () => ({ status: "error" as const, message: "Deletion failed." })));
vi.mock("@/app/pops/actions", () => ({ deletePipelineAction: deletion }));

beforeEach(() => {
  deletion.mockClear();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});

describe("DeletePipelineControl", () => {
  it("names the exact pipeline, allows cancellation, and does not mutate on open or cancel", () => {
    const { container } = render(<DeletePipelineControl id="cmwb7ci13000b08iczjdui7r2" name="Recursive flashcard ladder" />);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByText("Delete “Recursive flashcard ladder”?")).toBeTruthy();
    expect(container.querySelector("dialog")?.hasAttribute("open")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(container.querySelector("dialog")?.hasAttribute("open")).toBe(false);
    expect(deletion).not.toHaveBeenCalled();
  });

  it("submits only after destructive confirmation and shows a server failure", async () => {
    render(<DeletePipelineControl id="cmwb7ci13000b08iczjdui7r2" name="Recursive flashcard ladder" />);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete pipeline" }));
    await waitFor(() => expect(deletion).toHaveBeenCalledTimes(1));
    expect((deletion.mock.calls[0] as unknown[])[1]).toBeInstanceOf(FormData);
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Deletion failed."));
  });
});

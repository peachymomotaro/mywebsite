// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DeleteTaskControl } from "@/components/pops/DeleteTaskControl";

const deletion = vi.hoisted(() => vi.fn(async () => ({ status: "error" as const, message: "Deletion failed." })));
vi.mock("@/app/pops/actions", () => ({ deleteTaskAction: deletion }));

beforeEach(() => {
  deletion.mockClear();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});

describe("DeleteTaskControl", () => {
  it("shows the exact task and does not delete when opened or cancelled", () => {
    const { container } = render(<DeleteTaskControl id="cmwiq0i9j000007jt5uklpshm" name="Unwanted task" activeSubtasks={0} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByText("Delete “Unwanted task”?")).toBeTruthy();
    expect(container.querySelector("dialog")?.hasAttribute("open")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(container.querySelector("dialog")?.hasAttribute("open")).toBe(false);
    expect(deletion).not.toHaveBeenCalled();
  });

  it("requires confirmation before calling the owner action and displays errors", async () => {
    render(<DeleteTaskControl id="cmwiq0i9j000007jt5uklpshm" name="Unwanted task" activeSubtasks={0} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete task" }));
    await waitFor(() => expect(deletion).toHaveBeenCalledTimes(1));
    const data = (deletion.mock.calls[0] as unknown[])[1] as FormData;
    expect(data.get("id")).toBe("cmwiq0i9j000007jt5uklpshm");
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Deletion failed."));
  });

  it("prevents submitting when a task has live subtasks", () => {
    render(<DeleteTaskControl id="cmwiq0i9j000007jt5uklpshm" name="Parent task" activeSubtasks={2} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByRole("button", { name: "Delete task" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByText("This task has 2 subtasks. Delete or move them first.")).toBeTruthy();
    expect(deletion).not.toHaveBeenCalled();
  });
});

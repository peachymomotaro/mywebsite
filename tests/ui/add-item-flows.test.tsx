import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useActionStateMock = vi.hoisted(() => vi.fn());

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");

  return {
    ...actual,
    useActionState: useActionStateMock,
  };
});

import AddPage from "@/app/reading-river/add/page";
import { ManualItemForm } from "@/components/reading-river/manual-item-form";
import { UrlIntakeForm } from "@/components/reading-river/url-intake-form";

describe("AddPage", () => {
  beforeEach(() => {
    useActionStateMock.mockReset();
    useActionStateMock.mockImplementation((_action, initialState) => [initialState, vi.fn()]);
  });

  it("shows the updated add-page copy and only one selected form at a time", async () => {
    const page = await AddPage();

    render(page);

    expect(screen.getByRole("heading", { name: "Add to stream" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Save a link or jot down something to read. Links fetch details first so you can review them before they enter the stream.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Reading River can usually suggest the title and reading time, and you can edit either before saving.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Paste a link" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Paste a link" })).toHaveClass("river-primary-action");
    expect(screen.getByRole("button", { name: "Manual item" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Manual item" })).toHaveClass("river-primary-action");
    expect(screen.getByRole("heading", { name: "Paste a link" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fetch details" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Write it down" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Bring something into the stream" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Estimated minutes")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Estimated minutes (optional)")).not.toBeInTheDocument();
    expect(screen.getByLabelText("URL")).toHaveAttribute("type", "text");
    expect(screen.queryByLabelText("Notes")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Manual item" }));

    expect(screen.getByRole("button", { name: "Manual item" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("heading", { name: "Write it down" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Paste a link" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Status")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Notes")).not.toBeInTheDocument();
  });

  it("shows inline success feedback for the URL form", () => {
    useActionStateMock.mockImplementationOnce(() => [
      {
        status: "success",
        message: 'Added "Saved essay" to the stream.',
        savedTitle: "Saved essay",
        submittedAt: 1,
      },
      vi.fn(),
    ]);

    render(<UrlIntakeForm />);

    expect(screen.getByText('Added "Saved essay" to the stream.')).toBeInTheDocument();
    expect(screen.getByText("Saved essay")).toBeInTheDocument();
  });

  it("shows the review state for the URL form when details were fetched", () => {
    useActionStateMock.mockImplementationOnce(() => [
      {
        status: "review",
        message: "Fetched article details. Review the title and reading time, then save it.",
        draftValues: {
          url: "https://example.com/essay",
          title: "Essay",
          notes: "Why this belongs in the stream",
          priorityScore: "7",
          estimatedMinutes: "4",
          tagNames: "work, essays",
        },
        reviewMetadata: {
          fetchSucceeded: true,
          estimatedMinutesRequired: false,
          extractedTitle: "Essay",
          siteName: "Example",
          author: null,
          wordCount: 400,
          estimatedMinutes: 4,
          lengthEstimationMethod: "readability",
          lengthEstimationConfidence: "medium",
        },
        submittedAt: 1,
      },
      vi.fn(),
    ]);

    render(<UrlIntakeForm />);

    expect(screen.getByText("Fetched article details. Review the title and reading time, then save it.")).toBeInTheDocument();
    expect(screen.getByLabelText("Estimated minutes")).not.toBeRequired();
    expect(screen.getByLabelText("Estimated minutes")).toHaveValue(4);
    expect(screen.getByLabelText("URL")).toHaveValue("https://example.com/essay");
    expect(screen.getByLabelText("Title")).toHaveValue("Essay");
    expect(screen.queryByLabelText("Notes")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Priority")).toHaveValue(7);
    expect(screen.getByText("0–10, where 10 is highest priority.")).toBeInTheDocument();
    expect(screen.getByLabelText("Tags")).toHaveValue("work, essays");
    expect(screen.getByRole("button", { name: "Save article" })).toBeInTheDocument();
  });

  it("shows a manual review state when the page cannot be fetched", () => {
    useActionStateMock.mockImplementationOnce(() => [
      {
        status: "review",
        message:
          "I couldn't fetch this page. Review the title and add a reading time before saving it manually.",
        draftValues: {
          url: "https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2033231",
          title: "Essay override",
          notes: "Why this belongs in the stream",
          priorityScore: "7",
          estimatedMinutes: "",
          tagNames: "work, essays",
        },
        reviewMetadata: {
          fetchSucceeded: false,
          estimatedMinutesRequired: true,
          extractedTitle: null,
          siteName: null,
          author: null,
          wordCount: null,
          estimatedMinutes: null,
          lengthEstimationMethod: "unknown",
          lengthEstimationConfidence: "unknown",
        },
        submittedAt: 1,
      },
      vi.fn(),
    ]);

    render(<UrlIntakeForm />);

    expect(
      screen.getByText(
        "I couldn't fetch this page. Review the title and add a reading time before saving it manually.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save article" })).toBeInTheDocument();
    expect(screen.getByLabelText("Estimated minutes")).toBeRequired();
    expect(screen.getByLabelText("URL")).toHaveValue(
      "https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2033231",
    );
    expect(screen.getByLabelText("Title")).toHaveValue("Essay override");
    expect(screen.queryByLabelText("Notes")).not.toBeInTheDocument();
  });

  it("shows inline success feedback for the manual form", () => {
    useActionStateMock.mockImplementationOnce(() => [
      {
        status: "success",
        message: 'Added "Reading notebook entry" to the stream.',
        savedTitle: "Reading notebook entry",
        submittedAt: 1,
      },
      vi.fn(),
    ]);

    render(<ManualItemForm />);

    expect(screen.getByLabelText("Estimated minutes")).toBeRequired();
    expect(screen.queryByLabelText("Status")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Notes")).not.toBeInTheDocument();
    expect(screen.getByText("0–10, where 10 is highest priority.")).toBeInTheDocument();
    expect(screen.getByText('Added "Reading notebook entry" to the stream.')).toBeInTheDocument();
    expect(screen.getByText("Reading notebook entry")).toBeInTheDocument();
  });
});

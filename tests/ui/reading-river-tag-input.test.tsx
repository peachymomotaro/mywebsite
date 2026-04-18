import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TagInput } from "@/components/reading-river/tag-input";

describe("TagInput", () => {
  it("suggests remembered tags for the current fragment", () => {
    render(
      <form>
        <TagInput knownTagNames={["Focus", "Policy", "Longform"]} />
      </form>,
    );

    fireEvent.change(screen.getByLabelText("Tags"), {
      target: { value: "po" },
    });

    expect(screen.getByRole("button", { name: "Policy" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Focus" })).not.toBeInTheDocument();
  });

  it("matches case-insensitively and replaces only the active fragment", () => {
    render(
      <form>
        <TagInput knownTagNames={["Focus", "Policy", "Longform"]} defaultValue="Focus, lo" />
      </form>,
    );

    fireEvent.change(screen.getByLabelText("Tags"), {
      target: { value: "Focus, LO" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Longform" }));

    expect(screen.getByLabelText("Tags")).toHaveValue("Focus, Longform");
  });

  it("does not show suggestions for an empty current fragment", () => {
    render(
      <form>
        <TagInput knownTagNames={["Focus", "Policy", "Longform"]} defaultValue="Focus, " />
      </form>,
    );

    expect(screen.queryByRole("button", { name: "Policy" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Longform" })).not.toBeInTheDocument();
  });
});

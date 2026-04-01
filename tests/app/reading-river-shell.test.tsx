import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditorialShell } from "@/app/reading-river/layout";

describe("EditorialShell", () => {
  it("keeps Reading River navigation inside the prefixed route space", () => {
    render(
      <EditorialShell isAdmin={true}>
        <div>child</div>
      </EditorialShell>
    );

    expect(screen.getByRole("link", { name: "Reading River" })).toHaveAttribute(
      "href",
      "/reading-river"
    );
    expect(screen.getByRole("link", { name: "Read history" })).toHaveAttribute(
      "href",
      "/reading-river/history"
    );
    expect(screen.getByRole("link", { name: "Admin" })).toHaveAttribute(
      "href",
      "/reading-river/admin"
    );
  });
});

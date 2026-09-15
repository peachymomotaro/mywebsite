import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import EmailButton from "@/components/EmailButton";

describe("EmailButton", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps the email address out of the DOM until the visitor clicks", () => {
    let clickedHref = "";
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function () {
      clickedHref = this.href;
    });

    const { container } = render(<EmailButton label="Email me" />);

    expect(screen.getByRole("button", { name: "Email me" })).toBeInTheDocument();
    expect(container).not.toHaveTextContent("curry.peter@googlemail.com");
    expect(container.querySelector("a[href^='mailto:']")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Email me" }));

    expect(clickedHref).toBe("mailto:curry.peter@googlemail.com");
    expect(container.querySelector("a[href^='mailto:']")).toBeNull();
  });

  it("adds an encoded subject when one is supplied", () => {
    let clickedHref = "";
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function () {
      clickedHref = this.href;
    });

    render(<EmailButton label="Join the beta" subject="Reading River" />);
    fireEvent.click(screen.getByRole("button", { name: "Join the beta" }));

    expect(clickedHref).toBe(
      "mailto:curry.peter@googlemail.com?subject=Reading%20River",
    );
  });
});

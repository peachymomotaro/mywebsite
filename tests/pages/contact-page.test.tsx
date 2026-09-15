import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Contact from "@/pages/contact";

describe("Contact", () => {
  it("offers email without rendering the address", () => {
    const { container } = render(<Contact />);

    expect(screen.getByRole("button", { name: "Email me" })).toBeInTheDocument();
    expect(container).not.toHaveTextContent("curry.peter@googlemail.com");
    expect(container.querySelector("a[href^='mailto:']")).toBeNull();
  });

  it("shows email and LinkedIn as one flat action row", () => {
    const { container } = render(<Contact />);
    const actions = container.querySelector(".contact-actions");
    const linkedIn = screen.getByRole("link", { name: "LinkedIn" });

    expect(actions).toBeInTheDocument();
    expect(actions?.children).toHaveLength(2);
    expect(container.querySelector(".card")).toBeNull();
    expect(linkedIn).toHaveClass("button");
    expect(linkedIn).toHaveAttribute(
      "href",
      "https://www.linkedin.com/in/peter-curry-5a2138153/",
    );
  });
});

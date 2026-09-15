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
});

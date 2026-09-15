import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
// @ts-expect-error -- the legacy component is JavaScript without declarations.
import Layout from "@/components/Layout";

vi.mock("@/components/NavBar", () => ({
  default: () => <nav>Navigation</nav>,
}));

vi.mock("@/components/Footer", () => ({
  default: () => <footer>Footer</footer>,
}));

describe("Layout", () => {
  it("applies the wider container only when requested", () => {
    const { rerender } = render(
      <Layout>
        <p>Standard content</p>
      </Layout>
    );

    expect(screen.getByRole("main").firstElementChild).toHaveClass("container");
    expect(screen.getByRole("main").firstElementChild).not.toHaveClass(
      "container-wide"
    );

    rerender(
      <Layout wideContent>
        <p>Wide content</p>
      </Layout>
    );

    expect(screen.getByRole("main").firstElementChild).toHaveClass(
      "container",
      "container-wide"
    );
  });
});

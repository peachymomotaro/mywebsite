import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Projects from "@/pages/projects";

vi.mock("next/head", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("Projects page", () => {
  it("presents Reading River as a project with its philosophy, links, and image", () => {
    render(<Projects />);

    const sampleStoryHeading = screen.getByRole("heading", {
      name: "Generate a sample short story",
    });
    const readingRiverHeading = screen.getByRole("heading", {
      name: "Reading River",
    });

    expect(
      sampleStoryHeading.compareDocumentPosition(readingRiverHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      screen.getByText(/more like a river than a bucket/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/lower the pressure to read everything/i)
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open Reading River" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "The Basics" })).toBeNull();
    expect(
      screen.queryByText(/Find things that you think are worth reading/i)
    ).toBeNull();
    expect(
      screen.getByRole("heading", { name: "The Philosophy and How It Works" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Letting things sit lets us better assess/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/If you set how long you have to read/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Oliver Burkeman on the river" })
    ).toHaveAttribute("href", "https://www.oliverburkeman.com/river");
    expect(
      screen.getByRole("link", {
        name: "David Epstein, How To Improve Your Information Diet",
      })
    ).toHaveAttribute(
      "href",
      "https://davidepstein.substack.com/p/how-to-improve-your-information-diet"
    );
    expect(
      screen.getByText(
        "If you'd like to join the Reading River beta, just drop me an email saying you'd like to try it and I'll get back to you."
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Sign up for the Reading River/i })
    ).toHaveAttribute(
      "href",
      "mailto:curry.peter@googlemail.com?subject=Reading%20River"
    );
    expect(
      screen.getByRole("img", { name: "Reading River app screenshot" })
    ).toHaveAttribute("src", "/ReadingRiver.png");
    expect(
      screen.getByText(/drop me an email/i).compareDocumentPosition(
        screen.getByRole("img", { name: "Reading River app screenshot" })
      ) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Expand Reading River app screenshot" })
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getAllByRole("img", { name: "Reading River app screenshot" })
    ).toHaveLength(2);
  });
});

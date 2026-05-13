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
  it("links to the top-level projects from the contents section", () => {
    render(<Projects />);

    expect(
      screen.getByRole("navigation", { name: "Project contents" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Chatham House future worlds" })
    ).toHaveAttribute("href", "#chatham-house");
    expect(
      screen.getByRole("link", { name: "Exploring Bayesian Optimisers" })
    ).toHaveAttribute("href", "#exploring-bayesian-optimisers");
    expect(screen.getByRole("link", { name: "Reading River" })).toHaveAttribute(
      "href",
      "#reading-river"
    );
    expect(
      document.getElementById("exploring-bayesian-optimisers")
    ).not.toBeNull();
    expect(document.getElementById("capstone-bo")).not.toBeNull();
  });

  it("links the Bayesian Optimisers project to the hidden Bayesian optimisation game", () => {
    render(<Projects />);

    expect(
      screen.getByRole("heading", { name: "Exploring Bayesian Optimisers" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Bayesian optimisation and Gaussian Processes/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/black-box optimisation \(BBO\) challenge/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Go to the Model Card" })
    ).toHaveAttribute(
      "href",
      "https://github.com/peachymomotaro/capstone/blob/main/docs/Model_Card.md"
    );
    expect(
      screen.getByRole("img", { name: "Bayesian optimisation game preview" })
    ).toHaveAttribute("src", "/BayesianOptimiser.png");
    expect(
      screen.getByRole("link", {
        name: "Play the Bayesian optimisation game",
      })
    ).toHaveAttribute("href", "/bayesgame");
  });

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

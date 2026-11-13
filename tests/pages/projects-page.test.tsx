import { render, screen } from "@testing-library/react";
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
  it("opts into the wider site layout", () => {
    expect(Projects.wideContent).toBe(true);
  });

  it("uses editorial project notes instead of uppercase eyebrow labels", () => {
    const { container } = render(<Projects />);

    expect(screen.getByText("Machine learning capstone")).toHaveClass(
      "project-kicker"
    );
    expect(screen.getByText("Personal tool")).toHaveClass("project-kicker");
    expect(container.querySelector(".partner-label")).toBeNull();
  });

  it("shows the remaining projects without a contents box and omits Scenario Builder", () => {
    render(<Projects />);

    const bayesianProject = document.getElementById(
      "exploring-bayesian-optimisers"
    );

    expect(
      screen.queryByRole("navigation", { name: "Project contents" })
    ).toBeNull();
    expect(bayesianProject).not.toBeNull();
    expect(document.getElementById("reading-river")).not.toBeNull();
    expect(document.getElementById("capstone-bo")).not.toBeNull();
    expect(document.getElementById("scenario-builder")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Scenario Builder" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Scenario Builder" })).toBeNull();
    expect(screen.queryByText(/I am currently working with Lucid Dot/i)).toBeNull();
    expect(screen.queryByRole("img", { name: "Chatham House logo" })).toBeNull();
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

  it("describes the current Reading River experience and links to the live guest river", () => {
    render(<Projects />);

    const bayesianHeading = screen.getByRole("heading", {
      name: "Exploring Bayesian Optimisers",
    });
    const readingRiverHeading = screen.getByRole("heading", {
      name: "Reading River",
    });

    expect(
      readingRiverHeading.compareDocumentPosition(bayesianHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(screen.getByText(/more like a river than a bucket/i)).toBeInTheDocument();
    expect(screen.getByText(/lower the pressure to read everything/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "How it works" })).toBeInTheDocument();
    expect(screen.getByText(/paper boats in a three-dimensional riverside scene/i)).toBeInTheDocument();
    expect(screen.getByText(/up to five pieces you have started reading/i)).toBeInTheDocument();
    expect(screen.getByText(/a golden tree grows on the bank/i)).toBeInTheDocument();
    expect(screen.getByText(/daily email containing/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Oliver Burkeman on the river" })).toHaveAttribute(
      "href", "https://www.oliverburkeman.com/river"
    );
    expect(screen.getByRole("link", { name: "Explore the guest river" })).toHaveAttribute(
      "href", "/reading-river/guest"
    );
    expect(screen.getByRole("link", { name: "Join the beta waiting list" })).toHaveAttribute(
      "href", "/reading-river/waiting-list"
    );
    expect(screen.getByRole("link", { name: "How Reading River works" })).toHaveAttribute(
      "href", "/reading-river/how-it-works"
    );
    expect(screen.queryByText(/Then it sorts by a simple equation/i)).toBeNull();
    expect(screen.queryByRole("img", { name: "Reading River app screenshot" })).toBeNull();
  });
});

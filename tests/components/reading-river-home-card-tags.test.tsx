import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomeCardTags } from "@/components/reading-river/home-card-tags";

describe("HomeCardTags", () => {
  it("shows short tag lists inline", () => {
    render(<HomeCardTags tags={["focus", "ideas"]} />);

    expect(screen.getByText("focus, ideas")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "View 2 tags" })).not.toBeInTheDocument();
  });

  it("collapses long tag lists until the reader expands them", () => {
    render(
      <HomeCardTags
        tags={["behavioral economics", "strategy", "product", "history"]}
      />,
    );

    expect(screen.getByRole("button", { name: "View 4 tags" })).toBeInTheDocument();
    expect(
      screen.queryByText("behavioral economics, strategy, product, history"),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "View 4 tags" }));

    expect(
      screen.getByText("behavioral economics, strategy, product, history"),
    ).toBeInTheDocument();
  });
});

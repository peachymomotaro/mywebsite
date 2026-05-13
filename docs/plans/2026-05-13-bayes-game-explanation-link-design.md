# Bayes Game Explanation Link Design

## Goal

Help players understand the Bayesian optimisation game by adding an obvious explanation link and making the existing Bayesian optimisation write-up visible on the page.

## Design

Add a fixed-position link in the top-right of the Bayes game page with the label `What’s going on?`. The link will point to `#whats-going-on`.

At the bottom of the Bayes game page, below the interactive game, add an explanation section with `id="whats-going-on"`. It will render the text from `Bayesian_Optimisation/Bayesian_Optimisation.md` in a readable dark panel consistent with the Bayes game theme.

The markdown rendering can stay intentionally light: first line as a heading, normal text blocks as paragraphs, `---` as a divider, and simple preservation of the existing article text. This avoids adding a markdown dependency for one local document.

## Testing

Update the Bayes page test to assert that:

- The `What’s going on?` link is present.
- It points to `#whats-going-on`.
- The bottom explanation section renders the markdown heading and representative body copy.

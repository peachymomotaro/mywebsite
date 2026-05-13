# Site Typography Scale Design

## Goal

Make the website generally more readable by increasing the default type scale without making dense interfaces feel cramped.

## Design

Increase the global body font size to `1.08rem`. This should lift regular prose across the site while keeping the existing layout and hierarchy intact.

Make small supporting adjustments:

- Increase lead copy to `1.2rem`.
- Increase nav links and standard buttons to `1rem`.
- Increase small metadata text such as `.small`, `.card-meta`, and related secondary labels slightly.
- Keep major headings mostly unchanged, because the readability issue is with body copy rather than page titles.
- Keep the Bayes game controls comparatively restrained so the game board and control panel remain usable.

## Verification

Run the relevant page tests, then inspect key pages in the browser:

- `/`
- `/projects`
- `/bayesgame`

Check that pages render without a framework overlay and that text remains readable without obvious overlap.

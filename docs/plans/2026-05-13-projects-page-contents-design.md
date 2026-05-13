# Projects Page Contents Design

## Goal

Make the Projects page easier to scan and share by adding a contents section that links to each top-level project. The structure should stay easy to extend as more projects are added.

## Scope

The contents section will include only top-level projects:

- Chatham House / future worlds project: `#chatham-house`
- Exploring Bayesian Optimisers: `#exploring-bayesian-optimisers`
- Reading River: `#reading-river`

Subsections such as the scenario builder preview, sample story generator, and technical note will not appear in the contents section.

## Design

Add a small project metadata array in `pages/projects.js` and render the contents section from it. This keeps the visible contents links and project anchors aligned as the page grows.

Place the contents section near the top of the page, after the introductory hero. It should feel like page navigation rather than a separate feature: compact, readable, and consistent with the existing visual language.

Rename the existing Bayesian Optimisers section anchor from `#capstone-bo` to `#exploring-bayesian-optimisers`. Preserve old inbound links by keeping a small legacy `#capstone-bo` anchor at the start of that section.

## Testing

Update the Projects page test to assert that:

- The contents section links to the three top-level projects.
- The Bayesian Optimisers section uses `id="exploring-bayesian-optimisers"`.
- A legacy `#capstone-bo` anchor remains available for old links.

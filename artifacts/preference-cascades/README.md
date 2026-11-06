# Preference cascades: follow-up to PR #8

This implements the handoff on [PR #8](https://github.com/peachymomotaro/mywebsite/pull/8). That PR had already merged, so this work is on a follow-up branch for a new draft PR against `main`. No production deployment or merge was performed.

## Design audit and choices

Inspected the live home, blog and projects pages in light/dark themes, the old experiment, shared layout/navigation/footer, `pages/_app.js`, and `styles/globals.css`. The site's contract is Literata for editorial content, Fira Code for code, a 720px normal / 900px wide container with 24px gutters, 2.6rem desktop / 2.1rem mobile headings, 1.7 line height, ordinary rust links, simple navigation, restrained borders and existing pill buttons. The existing light/dark variables supply every experiment colour. No navigation entry or sitemap change was added.

Loaded and applied these actual skill files from their source/local checkouts:

- [avoid-ai-design](https://github.com/funboy322/avoid-ai-design): `inside-design-system` audit, then rewrite within the site's contract. Initial source scan: three P1 findings and one P2 finding. The render also showed a separate wordmark, unrelated palette, small chart labels and a light-only surface. The final scan reports zero findings. The L4 suppression beside the valley's 0/40/100 scale labels documents a false positive for a promotional stat strip.
- `gpt-taste` from the installed local skill: applied its hierarchy, readable headline width, spacing, control contrast and label checks. The handoff explicitly gives the existing website precedence over random fonts/palettes, AIDA marketing structure, GSAP, bento grids and decorative effects; those prescriptions were not applied.
- [avoid-ai-writing](https://github.com/conorbronsdon/avoid-ai-writing): read the full skill and pattern guide, extracted the page's prose to a scratch Markdown file, and ran the detector in technical context. It reported zero matches before and after. One manual editing pass (of a maximum two) replaced the introductory rhetorical teaser and an abstract “at the heart” closing phrase. The quote normaliser ran on only the changed prose; the preservation validator reported no mechanical preservation errors. Manual review retained the technical contrast in “actual public dissent”, the conditional claims, numbers, source names, and quoted threshold example. No further justified in-scope edit remained.

The experiment reuses `Layout`, navigation, footer, theme control and fonts. Navigation now reads `usePathname` so the same component works in both Next.js routers; the links themselves are unchanged. A declaration describes the existing JavaScript Layout API.

## Mathematical assumptions

The source image's Figure 4.3 says only 40 is self-reproducing. Its visible example maps an expectation of 20 to an actual opinion of 35.

The first exercise uses linear interpolation between `(0,30), (20,35), (40,40), (60,52), (80,70), (100,95)`. These points are an illustrative approximation, not claimed digitisation, Kuran's formula, or empirical observations. On every segment below 40, `x < f(x) <= 40`; above 40, `40 <= f(x) < x`. Consequently, 40 is the only fixed point and every initial expectation converges towards it. The display stops within 0.01 percentage points. The ball's bowl is an explicit analogy for adjustment direction, not a physical dynamics model.

The separate cascade extension has ten equally weighted people, all of whom privately favour change. Baseline thresholds are `[0,20,20,30,40,50,60,70,80,90]` percent. At expectation `x`, a person speaks exactly when their threshold is `<= x`, including their own contribution. The count divided by ten supplies the next expectation. Updates are simultaneous and reversible. The initial spark is an expectation, not a permanently committed group.

Only person 2's threshold is editable. Both comparison cases share the same initial expectation, population, private preferences and rule. With a zero spark, the baseline stops at 10%; lowering person 2 to 10% creates the computed sequence `0,10,20,...,100`. Raising their threshold to 30% still stops at 10%. A spark of 20% also starts the baseline cascade. No outcome is hard-coded. The page distinguishes private preference, public expression, expected public dissent and actual public dissent.

## Verification

- Regression demonstrated: the old polynomial failed the unique-equilibrium and convergence tests at a starting expectation of 60%.
- `npm test -- tests/lib/preference-cascades.test.ts tests/ui/preference-cascades.test.tsx tests/components/layout.test.tsx`: 12 tests pass. These cover convergence from both sides, threshold equality/counts, deterministic rounds, cascade and no-cascade cases, reset, keyboard input, pause and cancelling pending playback when a condition changes.
- `npm run build`: passes, including prerendering this route. Network access was required for the site's existing Google Fonts. The initial sandboxed build stalled and was cancelled; the unrestricted run completed.
- `npm test`: 309 pass, four fail, 20 skipped. All four failures reproduce on unchanged `main`: the blog-updates quote assertion, two projects-page assertions and the stale navigation assertion expecting a Reading River link. Unchanged `main` also has a fifth failure from mounting the old Pages-router navigation without its router context. The new pathname-based navigation removes that failure. The 20 database integration tests are skipped without a test database.
- `npx tsc --noEmit --incremental false`: 20 existing diagnostics, identical to a clean `main` checkout after normalising checkout paths. No new diagnostics. These are in existing tests/legacy JavaScript imports; the Next.js production build's application typecheck passes.
- `npm run lint`: unsupported repository script (`next lint` is no longer a command); exits with “Invalid project directory .../lint”. No lint configuration or dependency changes are included.
- `git diff --check`: passes.
- Browser verification: 1440px desktop, 768px tablet, 390px phone; light and dark themes; no horizontal overflow. Graph pointer drag and keyboard Home/End/PageUp, step, play, reset and automatic equilibrium stopping checked. Extension decisions, comparison, playback and an all-ten-speaking result checked. Reduced-motion emulation reports zero transition duration; the model is usable through Step without animation. No browser warnings/errors observed on the experiment.
- Rendered `robots` and `googlebot` metadata are both `noindex, nofollow`. Sitemap and navigation entries remain unchanged.

## Screenshots

All screenshots are from the live original or the local follow-up, not production changes. The screenshots show actual rendered content; no illustrative mockups are used.

| View | Original | Follow-up |
| --- | --- | --- |
| Desktop | [Before](before-desktop.jpg) | [Light](after-desktop-light.jpg), [dark](after-desktop-dark.jpg) |
| Phone | [Before](before-mobile.jpg) | [Light](after-mobile-light.jpg), [dark](after-mobile-dark.jpg) |
| Tablet | — | [Dark](after-tablet-dark.jpg) |

[Graph and controls](figure-desktop-light.jpg).

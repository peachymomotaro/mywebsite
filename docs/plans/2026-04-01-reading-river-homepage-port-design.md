# Reading River Homepage Port Design

## Goal

Restore the merged `Peter Website` Reading River homepage so `/reading-river` behaves as closely as possible to the original standalone Reading River home page, while keeping the Reading River app isolated under `/reading-river/*`.

## Chosen Approach

Use a direct behavioral port inside the existing merged Reading River shell.

This keeps the current merged layout and route isolation, but replaces the temporary homepage stub with the original standalone behavior:

- require a logged-in Reading River user
- read the `time` search param
- load personalized homepage data with `getHomePageData`
- render the `Next priority read` card
- render the `From the stream` card
- render the time-budget picker

This is the closest match to standalone behavior without touching the rest of the public website.

## Page Behavior

The merged `/reading-river` page should become an async server page again.

It should:

- call `requireCurrentUser()`
- parse `searchParams.time`
- call `getHomePageData({ userId, timeBudgetMinutes })`
- render the original homepage structure:
  - `Pick your next read`
  - `Add to stream`
  - `Next priority read`
  - `From the stream`
  - `Choose a time`

The placeholder copy on the current merged homepage should be removed.

## Layout And Route Fidelity

The merged Reading River shell should preserve standalone behavior where it matters, while still remaining isolated from the public site.

### Layout behavior

The merged `app/reading-river/layout.tsx` should resolve the current Reading River user before rendering the shell, so the `Admin` nav item appears only for actual admin users. This matches the standalone Reading River layout behavior.

### Route-prefix safety

All homepage links and navigation must stay inside `/reading-river/*`.

The main gap is the time-budget picker, which currently generates `/` and `/?time=...` links. Those links must be updated to generate:

- `/reading-river`
- `/reading-river?time=5`
- `/reading-river?time=10`
- and so on

This restores standalone behavior without leaking into the main website routes.

## Testing And Safety Boundary

Keep this port deliberately narrow.

### Tests to add or update

- Add a focused UI test for the merged `/reading-river` homepage that mirrors the original standalone homepage expectations.
- Add route-prefix coverage for the time-budget picker so its links stay under `/reading-river`.
- Keep shell coverage to confirm Reading River navigation remains inside `/reading-river/*` and `Admin` visibility is user-dependent.

### Out of scope

- No redesign of the public website
- No changes to the legacy `pages/` router
- No new homepage ranking logic
- No expansion beyond the Reading River homepage and the small layout/route helpers it depends on

## Success Criteria

- `/reading-river` behaves like the original standalone Reading River homepage as closely as possible.
- The placeholder homepage copy is gone.
- Homepage time filters stay inside `/reading-river`.
- Reading River remains isolated from the rest of the website.

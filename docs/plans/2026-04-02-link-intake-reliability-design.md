# Link Intake Reliability Design

## Goal

Make Reading River's link intake resilient when users paste imperfect URLs or when target sites block or fail server-side fetches.

## Agreed Behavior

- Users can paste a bare domain or host-style URL, and the server should normalize it into a valid `https://...` URL before attempting fetches.
- If the page is fetched but the app cannot estimate reading time confidently, the form should ask for an estimated reading time and save on the next submit.
- If the page cannot be fetched at all, the form should tell the user that the page could not be fetched and explain that the URL may not exist or may block automated access.
- In that fetch-failure state, the form should offer a `Proceed anyway` action.
- After the user chooses `Proceed anyway`, the form should require a manual estimated reading time before saving the link.

## Product Approach

The existing URL intake already has a useful two-step retry model for low-confidence extraction. This design extends that pattern instead of replacing it.

We will add one new intake state for fetch failures, preserve the existing `needs_estimate` state for low-confidence extraction, and normalize incoming URLs server-side so the browser does not reject reasonable pasted input before the form reaches the action.

## URL Handling

- Change the URL input from strict browser URL validation to a more permissive text field optimized for URLs.
- Normalize common host-style inputs on the server:
  - `papers.ssrn.com/sol3/papers.cfm?abstract_id=2033231` -> `https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2033231`
  - `www.example.com/post` -> `https://www.example.com/post`
- Keep invalid or empty inputs from saving; malformed values should return a user-facing error rather than a generic failure.

## Fetch Failure Handling

Fetch failures should be treated differently from low-confidence extraction:

- Low-confidence extraction means the page was reachable but content quality was insufficient for a trusted estimate.
- Fetch failure means Reading River could not retrieve the page at all.

For fetch failures, the app should:

- store the draft values in form state
- show a specific warning message
- render a `Proceed anyway` button
- avoid saving immediately

When the user proceeds, the app should transition into a manual-estimate path and require estimated minutes before saving.

## Reliability Improvements

- Add a fetch timeout so slow or stalled sites do not leave the action hanging indefinitely.
- Keep logging for fetch failure details so server logs remain useful during production debugging.
- Preserve the existing successful extraction path unchanged for normal sites.

## User Messaging

Fetch failure copy should stay accurate:

- preferred: "I couldn't fetch this page. It may not exist, or it may block automated access."
- avoid claiming with certainty that the page does not exist

## Testing Strategy

Add focused tests for:

- server-side URL normalization when the user omits the scheme
- fetch failure returning a dedicated confirmation state
- proceeding after fetch failure without an estimate continuing to require estimated minutes
- proceeding after fetch failure with an estimate saving successfully
- existing successful extraction behavior remaining intact

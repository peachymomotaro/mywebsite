# Reading River Firefox Extension Design

## Goal

Let a signed-in Firefox extension user save the current page to Reading River without leaving the page they are on.

## Agreed Behavior

- Reading River will ship a Firefox-only browser extension for the first release.
- The extension opens as the browser's popup UI from the toolbar button, not as an in-page overlay.
- The popup should never navigate the user away from the current page.
- The extension must support its own login flow instead of depending on the website's cookie session.
- When signed in, opening the popup should prefill:
  - the current tab URL
  - a suggested title from the current tab title
- The user must enter a priority score before saving.
- Saving should create a new Reading River item immediately.
- The saved item should appear in the user's Reading River data as an unread URL item.
- The first release should not require estimated minutes.
- The first release should not include tags, notes, duplicate detection, page-content extraction, background enrichment, or Chrome/Edge/Safari packaging.

## Product Approach

The first release should be small and native to Reading River rather than a partial Zotero clone.

We will build a lightweight Firefox WebExtension popup backed by a token-authenticated JSON API inside the existing Next.js app. The extension will gather the current tab's URL and title, require the user to choose a priority, and send the item directly to the Reading River backend.

This keeps the user on the page they are reading, avoids the fragility of cookie-based extension auth, and limits the Firefox release to the exact interaction that was approved.

## Popup Experience

The popup has two states.

### Signed Out

- Show email and password inputs.
- Show a primary `Sign in` action.
- Submit credentials to a Reading River extension login endpoint.
- If login succeeds, store the returned token in extension storage and immediately switch into the signed-in save view.
- If login fails, show a short inline error and keep the entered email.

### Signed In

- Read the active tab when the popup opens.
- Prefill:
  - `URL`
  - `Title`
- Show a required `Priority` input.
- Keep the form intentionally small.
- On `Save`, send the page to Reading River in the background and keep the popup open long enough to show success or failure.
- After a successful save, show a compact confirmation and reset the priority field for the next save.

### Validation Rules

- `URL` must be a valid `http` or `https` URL by the time it reaches the backend.
- `Title` may be blank in the UI, but the backend should fall back to the URL if needed.
- `Priority` is required and must remain within the existing Reading River range of `0` to `10`.

## Auth Model

The extension should use its own token model rather than Reading River's browser session cookie.

### Why

- The current site auth is cookie-based and intended for browser navigation.
- Extension requests should not depend on ambient site cookies or proxy exceptions for authenticated website sessions.
- The extension needs a durable, revocable credential that can be stored in Firefox extension storage.

### Token Design

- Add a new `ExtensionToken` model to Prisma.
- Store only a token hash in the database, never the raw token.
- Return the raw token exactly once on successful login.
- Allow multiple active extension tokens per user so reinstalling or signing in on another machine does not invalidate an older install by accident.
- Support expiry and revocation.
- Track `lastUsedAt` for basic observability.

### Extension Auth Endpoints

- `POST /reading-river/api/extension/login`
  - accepts email and password
  - verifies the user with the existing password hash logic
  - rejects deactivated accounts
  - returns a raw extension token and minimal user info
- `POST /reading-river/api/extension/logout`
  - accepts bearer token auth
  - revokes the current token
  - returns success even if the local extension storage has already been cleared

## Save Model

The extension save path should be intentionally simpler than the existing URL intake review flow.

### Why

The current URL intake action is optimized for "paste a link, fetch metadata, review the result, then save." The approved extension flow is "open popup, confirm title, enter priority, save immediately." Those are related but not identical product shapes.

### Save Endpoint

- Add `POST /reading-river/api/extension/save`
- Authenticate using the extension bearer token
- Accept a small payload:
  - `url`
  - `title`
  - `priorityScore`
- Validate the request with Reading River's existing validation style
- Create a `ReadingItem` with:
  - `sourceType: "url"`
  - `sourceUrl`
  - `title`
  - `priorityScore`
  - `status: "unread"`
  - `estimatedMinutes: null`
  - `lengthEstimationMethod: null`
  - `lengthEstimationConfidence: null`

### Shared Creation Logic

Reading River already has a reusable `createReadingItem` action, but it currently resolves the user from the website session. For the extension flow, we should extract a lower-level helper that accepts an explicit `userId` and is used by both the existing action layer and the new extension API.

### No Extraction in v1

- Do not fetch the article URL from the server during save.
- Do not estimate reading time during save.
- Do not block saving on content extraction quality.
- Save first, enrich later only if that becomes a future feature.

## Routing and Middleware

The current Reading River proxy protects the `/reading-river/*` subtree with session-cookie checks. That behavior is correct for pages, but the new extension API must be reachable without a site cookie.

For the extension endpoints:

- allow `/reading-river/api/extension/*` through the proxy without redirecting to `/reading-river/login`
- keep authentication inside the API routes themselves using bearer tokens

This keeps the site login behavior unchanged for normal Reading River pages.

## Repo Layout

Add a new Firefox extension folder inside the current repo:

- `extension/reading-river-firefox/manifest.json`
- `extension/reading-river-firefox/popup.html`
- `extension/reading-river-firefox/popup.css`
- `extension/reading-river-firefox/popup.js`
- `extension/reading-river-firefox/lib/api-client.js`
- `extension/reading-river-firefox/lib/storage.js`

Backend additions:

- `app/reading-river/api/extension/login/route.ts`
- `app/reading-river/api/extension/save/route.ts`
- `app/reading-river/api/extension/logout/route.ts`
- `lib/reading-river/extension-auth.ts`
- `lib/reading-river/extension-items.ts` or an extracted shared item-creation helper

## Error Handling

- If the popup cannot read the current tab URL, show a clear "This page can't be saved right now" message.
- If login fails, keep the popup in the signed-out state and show a short inline error.
- If the bearer token is expired or revoked, clear the local token and return the popup to signed-out state.
- If save fails validation, preserve the entered values and show inline feedback.
- If the backend is unavailable, show a retryable network error.
- If save succeeds, show a short confirmation and do not open a new tab automatically.

## Testing Strategy

Add focused coverage for:

- Prisma schema expectations for the new extension token model
- token hashing, expiry, lookup, and revocation
- login endpoint success and failure cases
- save endpoint auth failures and payload validation
- successful item creation with nullable `estimatedMinutes`
- popup rendering in signed-out and signed-in states
- popup prefill of active tab title and URL
- required priority validation before save

## Release Scope

Release 1 is Firefox only.

That means:

- no Chrome Web Store packaging
- no Edge packaging
- no Safari work
- no store automation
- no translator system
- no page scraping beyond URL and tab title

If the Firefox release works well, Chrome and Edge can later reuse most of the same API shape and popup behavior.

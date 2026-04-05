# Reading River Firefox Extension Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Firefox-only Reading River extension with its own login/token flow and a popup that saves the current page to the user's stream with a required priority score.

**Architecture:** Add bearer-token extension auth to the existing Reading River backend, expose dedicated login/save/logout API routes under `/reading-river/api/extension/*`, and build a small Firefox WebExtension popup that reads the active tab and calls those APIs. Keep the first release intentionally small: save URL, title, and priority only, and do not block on reading-time extraction.

**Tech Stack:** Next.js route handlers, Prisma, TypeScript, Vitest, Testing Library, Firefox WebExtensions popup built with plain HTML/CSS/ES modules

---

### Task 1: Add extension token schema coverage and token-store helpers

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/202604051900_firefox_extension_tokens/migration.sql`
- Modify: `tests/schema/auth-models.test.ts`
- Create: `tests/auth/extension-auth.test.ts`
- Create: `lib/reading-river/extension-auth.ts`

**Step 1: Write the failing tests**

Add schema expectations for a new `ExtensionToken` model and unit tests that expect helpers shaped like:

```ts
const result = await createExtensionToken("user-1", { now });
expect(result.token).toMatch(/^[a-f0-9]{64}$/);

await expect(getCurrentUserFromExtensionToken("raw-token", now)).resolves.toMatchObject({
  id: "user-1",
});

await revokeExtensionToken("raw-token", now);
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/schema/auth-models.test.ts tests/auth/extension-auth.test.ts`
Expected: FAIL because the Prisma schema and `extension-auth` helpers do not exist yet.

**Step 3: Write minimal implementation**

Implement:

- an `ExtensionToken` Prisma model with:
  - `id`
  - `tokenHash`
  - `userId`
  - `expiresAt`
  - `revokedAt`
  - `createdAt`
  - `lastUsedAt`
- a `User.extensionTokens` relation
- a migration SQL file that creates the table and indexes
- `lib/reading-river/extension-auth.ts` with:
  - `createExtensionToken`
  - `getExtensionTokenByRawToken`
  - `getCurrentUserFromExtensionToken`
  - `revokeExtensionToken`

Use the existing session implementation as the reference pattern for secure token hashing and expiry handling.

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/schema/auth-models.test.ts tests/auth/extension-auth.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/202604051900_firefox_extension_tokens/migration.sql tests/schema/auth-models.test.ts tests/auth/extension-auth.test.ts lib/reading-river/extension-auth.ts
git commit -m "feat: add extension token auth model"
```

### Task 2: Add extension login and logout API routes

**Files:**
- Create: `app/reading-river/api/extension/login/route.ts`
- Create: `app/reading-river/api/extension/logout/route.ts`
- Create: `tests/auth/extension-api-auth.test.ts`
- Modify: `proxy.ts`

**Step 1: Write the failing tests**

Add route tests that verify:

```ts
const loginResponse = await POST(
  new Request("https://reading-river.test/reading-river/api/extension/login", {
    method: "POST",
    body: JSON.stringify({ email: "reader@example.com", password: "secret" }),
    headers: { "content-type": "application/json" },
  }),
);

expect(loginResponse.status).toBe(200);
expect(await loginResponse.json()).toEqual({
  token: expect.any(String),
  user: { id: "user-1", email: "reader@example.com", displayName: null },
});
```

Also cover:

- invalid credentials return `401`
- deactivated accounts return `403`
- logout with a valid bearer token revokes the token and returns `204`
- `proxy.ts` does not redirect `/reading-river/api/extension/login`

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/auth/extension-api-auth.test.ts tests/auth/middleware.test.ts`
Expected: FAIL because the routes do not exist and the proxy still redirects the extension API subtree.

**Step 3: Write minimal implementation**

Implement:

- `POST /reading-river/api/extension/login`
  - parse JSON body
  - normalize email
  - verify password with the same logic used by `app/reading-river/login/actions.ts`
  - reject deactivated users
  - create an extension token
  - return JSON
- `POST /reading-river/api/extension/logout`
  - read `Authorization: Bearer ...`
  - revoke the matching token
  - return `204`
- update `proxy.ts` so `/reading-river/api/extension/*` bypasses the session-cookie redirect

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/auth/extension-api-auth.test.ts tests/auth/middleware.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add app/reading-river/api/extension/login/route.ts app/reading-river/api/extension/logout/route.ts tests/auth/extension-api-auth.test.ts proxy.ts
git commit -m "feat: add extension auth routes"
```

### Task 3: Extract shared item-creation logic and add the extension save route

**Files:**
- Modify: `app/reading-river/actions/reading-items.ts`
- Create: `lib/reading-river/extension-items.ts`
- Create: `app/reading-river/api/extension/save/route.ts`
- Create: `tests/actions/extension-save-route.test.ts`

**Step 1: Write the failing tests**

Add save-route coverage that verifies:

```ts
const response = await POST(
  new Request("https://reading-river.test/reading-river/api/extension/save", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer extension-token",
    },
    body: JSON.stringify({
      url: "https://example.com/article",
      title: "Interesting essay",
      priorityScore: 8,
    }),
  }),
);

expect(response.status).toBe(201);
expect(prisma.readingItem.create).toHaveBeenCalledWith(
  expect.objectContaining({
    data: expect.objectContaining({
      userId: "user-1",
      sourceType: "url",
      sourceUrl: "https://example.com/article",
      title: "Interesting essay",
      priorityScore: 8,
      status: "unread",
      estimatedMinutes: null,
    }),
  }),
);
```

Also cover:

- missing or invalid bearer token returns `401`
- missing priority returns `400`
- out-of-range priority returns `400`
- blank title falls back to the URL

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/actions/extension-save-route.test.ts`
Expected: FAIL because the route and shared helper do not exist yet.

**Step 3: Write minimal implementation**

Implement:

- a lower-level item creation helper that accepts `userId` directly
- reuse that helper from the existing `createReadingItem` server action where reasonable
- `POST /reading-river/api/extension/save`
  - authenticate the extension token
  - parse and validate JSON body
  - create a `ReadingItem` with nullable `estimatedMinutes`
  - return `201` with the saved item id and title

Keep v1 intentionally narrow:

- no metadata extraction
- no tags
- no notes
- no duplicate suppression

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/actions/extension-save-route.test.ts tests/actions/reading-items.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add app/reading-river/actions/reading-items.ts lib/reading-river/extension-items.ts app/reading-river/api/extension/save/route.ts tests/actions/extension-save-route.test.ts
git commit -m "feat: add extension save endpoint"
```

### Task 4: Scaffold the Firefox popup and test its signed-out and signed-in states

**Files:**
- Create: `extension/reading-river-firefox/manifest.json`
- Create: `extension/reading-river-firefox/popup.html`
- Create: `extension/reading-river-firefox/popup.css`
- Create: `extension/reading-river-firefox/popup.js`
- Create: `extension/reading-river-firefox/lib/api-client.js`
- Create: `extension/reading-river-firefox/lib/storage.js`
- Create: `tests/ui/reading-river-firefox-popup.test.ts`

**Step 1: Write the failing tests**

Add popup tests that verify:

- the popup renders the login form when no stored token exists
- the popup renders the save form when a token exists
- the signed-in form displays URL and title fields plus a required priority input
- the save button is disabled or blocked until priority is entered

Example shape:

```ts
renderPopup({
  token: "stored-token",
  activeTab: {
    url: "https://example.com/article",
    title: "Saved from Firefox",
  },
});

expect(screen.getByDisplayValue("https://example.com/article")).toBeInTheDocument();
expect(screen.getByDisplayValue("Saved from Firefox")).toBeInTheDocument();
expect(screen.getByLabelText("Priority")).toBeRequired();
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ui/reading-river-firefox-popup.test.ts`
Expected: FAIL because the popup files do not exist yet.

**Step 3: Write minimal implementation**

Implement:

- a small popup HTML shell
- minimal popup CSS
- `popup.js` that:
  - reads token state from extension storage
  - reads the active tab URL and title
  - renders the signed-out or signed-in view
- `api-client.js` for `login`, `save`, and `logout`
- `storage.js` for persisting and clearing the token

Keep the popup plain HTML/CSS/JS so v1 does not require a second frontend build pipeline.

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ui/reading-river-firefox-popup.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add extension/reading-river-firefox/manifest.json extension/reading-river-firefox/popup.html extension/reading-river-firefox/popup.css extension/reading-river-firefox/popup.js extension/reading-river-firefox/lib/api-client.js extension/reading-river-firefox/lib/storage.js tests/ui/reading-river-firefox-popup.test.ts
git commit -m "feat: scaffold firefox extension popup"
```

### Task 5: Wire the popup login and save flow end to end

**Files:**
- Modify: `extension/reading-river-firefox/popup.js`
- Modify: `extension/reading-river-firefox/lib/api-client.js`
- Modify: `extension/reading-river-firefox/lib/storage.js`
- Modify: `tests/ui/reading-river-firefox-popup.test.ts`
- Create: `extension/reading-river-firefox/README.md`

**Step 1: Write the failing tests**

Add interaction tests that verify:

- submitting login stores the returned token and re-renders the save form
- clicking save sends `{ url, title, priorityScore }`
- successful save shows a confirmation message
- expired-token responses clear storage and return the popup to signed-out state
- network failures preserve form values and show a retryable error

Example shape:

```ts
await user.type(screen.getByLabelText("Email"), "reader@example.com");
await user.type(screen.getByLabelText("Password"), "secret");
await user.click(screen.getByRole("button", { name: "Sign in" }));

await user.clear(screen.getByLabelText("Priority"));
await user.type(screen.getByLabelText("Priority"), "8");
await user.click(screen.getByRole("button", { name: "Save" }));

expect(api.saveReadingItem).toHaveBeenCalledWith({
  url: "https://example.com/article",
  title: "Saved from Firefox",
  priorityScore: 8,
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ui/reading-river-firefox-popup.test.ts`
Expected: FAIL because the popup is still static and not wired to the API client.

**Step 3: Write minimal implementation**

Implement:

- login submission
- token persistence
- save submission
- inline success and error states
- token clearing on unauthorized responses
- a short Firefox dev README with:
  - how to load the extension temporarily
  - how to test login
  - how to test saving a page

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ui/reading-river-firefox-popup.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add extension/reading-river-firefox/popup.js extension/reading-river-firefox/lib/api-client.js extension/reading-river-firefox/lib/storage.js tests/ui/reading-river-firefox-popup.test.ts extension/reading-river-firefox/README.md
git commit -m "feat: connect firefox popup save flow"
```

### Task 6: Run verification and record remaining caveats

**Files:**
- No source changes required unless verification reveals a defect

**Step 1: Run focused verification**

Run: `npx vitest run tests/schema/auth-models.test.ts tests/auth/extension-auth.test.ts tests/auth/extension-api-auth.test.ts tests/actions/extension-save-route.test.ts tests/ui/reading-river-firefox-popup.test.ts`
Expected: PASS

**Step 2: Run full verification**

Run: `npm test -- --exclude '.worktrees/**'`
Expected: PASS

**Step 3: Perform manual Firefox verification**

Verify all of the following:

- temporary-load the extension in Firefox
- sign in through the popup
- save a live page without leaving it
- confirm the item appears in Reading River
- revoke the token and confirm the popup returns to signed-out state

**Step 4: Record remaining caveats**

- v1 saves only URL, title, and priority
- v1 does not estimate reading time during save
- v1 is Firefox only

**Step 5: Commit**

```bash
git add extension/reading-river-firefox/README.md
git commit -m "test: verify firefox extension flow"
```

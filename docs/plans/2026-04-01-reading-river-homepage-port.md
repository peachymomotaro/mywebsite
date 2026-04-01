# Reading River Homepage Port Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restore `/reading-river` so it behaves as closely as possible to the standalone Reading River homepage while keeping all behavior isolated under `/reading-river/*`.

**Architecture:** Reuse the already-ported Reading River homepage support code inside `Peter Website` and replace the temporary stub page with the original async server-page behavior. Keep the existing merged Reading River shell, but make it resolve the current user so admin navigation behaves like the standalone app, and make every homepage route helper stay inside the `/reading-river` prefix.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest, Testing Library, Prisma

---

### Task 1: Port the merged Reading River homepage page

**Files:**
- Modify: `app/reading-river/page.tsx`
- Create: `tests/ui/reading-river-home-page.test.tsx`
- Reference: `components/reading-river/home-read-card.tsx`
- Reference: `components/reading-river/time-budget-picker.tsx`
- Reference: `lib/reading-river/current-user.ts`
- Reference: `lib/reading-river/homepage-data.ts`

**Step 1: Write the failing test**

Create `tests/ui/reading-river-home-page.test.tsx` with a focused test that:

- mocks `@/lib/reading-river/current-user`
- mocks `@/lib/reading-river/homepage-data`
- mocks `@/app/reading-river/actions/reading-items`
- imports `@/app/reading-river/page`
- awaits the async page render
- asserts the page shows:
  - `Pick your next read`
  - `Add to stream`
  - `Next priority read`
  - `From the stream`
  - `Choose a time`
  - recommendation content returned from the mocked homepage data
- asserts the placeholder text is gone

Use the original standalone `tests/ui/home-page.test.tsx` from `Reading_River` as the reference shape, but update all imports to the merged `reading-river` paths.

**Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run tests/ui/reading-river-home-page.test.tsx
```

Expected: FAIL because `app/reading-river/page.tsx` still renders the temporary placeholder stub.

**Step 3: Write minimal implementation**

Update `app/reading-river/page.tsx` to:

- export `dynamic = "force-dynamic"`
- accept `searchParams`
- call `requireCurrentUser()`
- parse `searchParams.time` with `parseTimeBudgetSearchParam`
- call `getHomePageData({ userId, timeBudgetMinutes })`
- render the real homepage structure using:
  - `HomeReadCard`
  - `TimeBudgetPicker`
  - `readingRiverPath("/add")`

Keep the page under the existing Reading River route space and avoid touching the legacy website pages.

**Step 4: Run test to verify it passes**

Run:

```bash
npx vitest run tests/ui/reading-river-home-page.test.tsx
```

Expected: PASS

**Step 5: Commit**

```bash
git add app/reading-river/page.tsx tests/ui/reading-river-home-page.test.tsx
git commit -m "feat: port reading river homepage"
```

### Task 2: Keep time-budget navigation inside `/reading-river`

**Files:**
- Modify: `components/reading-river/time-budget-picker.tsx`
- Create: `tests/components/reading-river-time-budget-picker.test.tsx`
- Reference: `lib/reading-river/routes.ts`

**Step 1: Write the failing test**

Create `tests/components/reading-river-time-budget-picker.test.tsx` with tests that render `TimeBudgetPicker` and verify:

- `Any time` links to `/reading-river`
- `5 min` links to `/reading-river?time=5`
- `30 min` links to `/reading-river?time=30`
- the active selection still receives `aria-current="page"`

**Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run tests/components/reading-river-time-budget-picker.test.tsx
```

Expected: FAIL because the component still generates `/` and `/?time=...` links.

**Step 3: Write minimal implementation**

Update `components/reading-river/time-budget-picker.tsx` so `getHref()` uses `readingRiverPath()` instead of root-relative homepage URLs.

Keep the existing component API and styling unchanged.

**Step 4: Run test to verify it passes**

Run:

```bash
npx vitest run tests/components/reading-river-time-budget-picker.test.tsx
```

Expected: PASS

**Step 5: Commit**

```bash
git add components/reading-river/time-budget-picker.tsx tests/components/reading-river-time-budget-picker.test.tsx
git commit -m "fix: keep homepage time filters in reading river routes"
```

### Task 3: Restore admin-aware Reading River shell behavior

**Files:**
- Modify: `app/reading-river/layout.tsx`
- Modify: `tests/app/reading-river-shell.test.tsx`
- Reference: `lib/reading-river/current-user.ts`
- Reference: `components/reading-river/shell-nav.tsx`

**Step 1: Write the failing test**

Extend `tests/app/reading-river-shell.test.tsx` to cover the merged root layout behavior by:

- mocking `@/lib/reading-river/current-user`
- awaiting `RootLayout`
- asserting `Admin` appears when `getCurrentUser()` returns an admin user
- asserting `Admin` is absent when `getCurrentUser()` returns a non-admin user
- preserving the existing assertions that all nav links stay under `/reading-river/*`

**Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run tests/app/reading-river-shell.test.tsx
```

Expected: FAIL because the merged layout currently does not resolve the current user and defaults to `isAdmin = false`.

**Step 3: Write minimal implementation**

Update `app/reading-river/layout.tsx` to:

- import `getCurrentUser`
- make `RootLayout` async
- resolve the current Reading River user
- pass `currentUser?.isAdmin ?? false` into `EditorialShell`

Do not change the shell’s route-prefix behavior or public-site layout.

**Step 4: Run test to verify it passes**

Run:

```bash
npx vitest run tests/app/reading-river-shell.test.tsx
```

Expected: PASS

**Step 5: Commit**

```bash
git add app/reading-river/layout.tsx tests/app/reading-river-shell.test.tsx
git commit -m "feat: restore admin-aware reading river shell"
```

### Task 4: Verify the full homepage port

**Files:**
- Verify only

**Step 1: Run the focused test set**

Run:

```bash
npx vitest run tests/ui/reading-river-home-page.test.tsx tests/components/reading-river-time-budget-picker.test.tsx tests/app/reading-river-shell.test.tsx
```

Expected: PASS

**Step 2: Run the full suite**

Run:

```bash
npm test
```

Expected: PASS with the full Reading River and public-site test suite.

**Step 3: Run a production build**

Run:

```bash
npm run build
```

Expected: PASS

**Step 4: Commit**

```bash
git add -A
git commit -m "test: verify reading river homepage port"
```

Only make this final commit if verification requires tracked test or fixture updates. If verification produces no file changes, skip the commit and report clean verification.

# Reading River Home Remove Confirmation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a permanent remove action to Reading River homepage cards with a first-time confirmation prompt and a remembered per-browser opt-out for future confirmations.

**Architecture:** Keep the homepage cards server-rendered, but introduce a small client-side remove control that can manage inline confirmation UI and persist the confirmation preference in `localStorage`. Reuse the existing `deleteReadingItem` server action for the actual permanent delete so homepage revalidation continues to work through the current mutation flow.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest, Testing Library

---

### Task 1: Lock the remove interaction with failing UI tests

**Files:**
- Modify: `tests/ui/reading-river-home-page.test.tsx`
- Create: `tests/components/reading-river-home-remove-action.test.tsx`

**Step 1: Write the failing test**

Add assertions that:

- each populated homepage card renders a `Remove` button alongside the existing actions
- the new remove-action component does not show the confirmation text on first render
- clicking `Remove` shows `Are you sure?`
- the confirmation surface renders a `Don't ask this again in future` checkbox
- when the saved preference is already in `localStorage`, clicking `Remove` submits immediately without rendering the confirmation text

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/ui/reading-river-home-page.test.tsx tests/components/reading-river-home-remove-action.test.tsx`

Expected: FAIL because the homepage has no remove action and no inline confirmation component yet.

**Step 3: Write minimal implementation**

Do not implement yet. Only confirm the failure first.

**Step 4: Run test to verify it still fails for the right reason**

Run: `npm test -- tests/ui/reading-river-home-page.test.tsx tests/components/reading-river-home-remove-action.test.tsx`

Expected: FAIL with missing-button and missing-confirmation assertions.

### Task 2: Implement the client-side remove control

**Files:**
- Create: `components/reading-river/home-remove-action.tsx`
- Modify: `components/reading-river/home-read-card.tsx`

**Step 1: Write the failing test**

Use the tests from Task 1 plus an additional component assertion that:

- checking `Don't ask this again in future` and confirming removal stores the opt-out key in `localStorage`
- once the preference is stored, a later remove click calls the delete action immediately

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/components/reading-river-home-remove-action.test.tsx`

Expected: FAIL because there is no client remove component and no persisted confirmation preference.

**Step 3: Write minimal implementation**

Implement:

- a client component that renders the `Remove` button
- inline confirmation state with `Are you sure?`
- a `Don't ask this again in future` checkbox
- a `localStorage` key for the saved preference
- direct delete submission when the preference is already saved
- `HomeReadCard` wiring so the new control sits next to `Skip`

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/ui/reading-river-home-page.test.tsx tests/components/reading-river-home-remove-action.test.tsx`

Expected: PASS

### Task 3: Finish styling for the inline confirmation state

**Files:**
- Modify: `app/reading-river/reading-river.css`
- Modify: `components/reading-river/home-read-card.tsx`
- Modify: `components/reading-river/home-remove-action.tsx`

**Step 1: Write the failing test**

Use the existing UI tests to confirm the final labels and markup hooks after the remove control is integrated into the homepage card.

**Step 2: Run test to verify it fails**

Run the targeted UI suite if any assertions still fail after Task 2.

Expected: FAIL until the final inline confirmation structure and button placement are complete.

**Step 3: Write minimal implementation**

Add styling hooks for:

- the inline confirmation container
- the secondary remove button treatment
- the checkbox row and compact confirm actions

Keep the action group readable on both desktop and mobile widths.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/ui/reading-river-home-page.test.tsx tests/components/reading-river-home-remove-action.test.tsx`

Expected: PASS

### Task 4: Run verification

**Files:**
- No source changes required unless verification reveals a defect

**Step 1: Run focused verification**

Run: `npm test -- tests/ui/reading-river-home-page.test.tsx tests/components/reading-river-home-remove-action.test.tsx`

Expected: PASS

**Step 2: Run broader Reading River verification**

Run: `npm test -- tests/ui/reading-river-home-page.test.tsx tests/components/reading-river-home-card-tags.test.tsx tests/actions/reading-items.test.ts`

Expected: PASS

**Step 3: Record any remaining caveats**

- the confirmation preference is per browser because it is stored in `localStorage`
- if browser storage is unavailable, the remove flow should still work but continue asking for confirmation

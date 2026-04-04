# Reading River Home Card Edit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add homepage card tag and edit affordances, create a dedicated reading-item edit page, and simplify add-item forms by removing notes and manual-status inputs.

**Architecture:** Keep the homepage card server-rendered, but use a small client component for expandable tags. Add a focused server-rendered edit page with a server action for updates. Simplify the add flows by removing UI fields and defaulting manual item status in the action layer.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest, Testing Library, Prisma

---

### Task 1: Lock the new homepage-card behavior with tests

**Files:**
- Modify: `tests/ui/reading-river-home-page.test.tsx`
- Create: `tests/components/reading-river-home-card-tags.test.tsx`

**Step 1: Write the failing test**

Add assertions that:

- homepage cards render edit links for each featured item
- homepage cards render visible tags when tags are short
- the new tag component collapses when tags overflow and expands on click

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/ui/reading-river-home-page.test.tsx tests/components/reading-river-home-card-tags.test.tsx`

Expected: FAIL because the homepage has no edit links and no expandable tag component yet.

**Step 3: Write minimal implementation**

- add a client tag component for overflow-aware expansion
- add edit links and tag placement to `HomeReadCard`

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/ui/reading-river-home-page.test.tsx tests/components/reading-river-home-card-tags.test.tsx`

Expected: PASS

### Task 2: Fetch homepage tags from the database

**Files:**
- Modify: `lib/reading-river/homepage-data.ts`
- Modify: `tests/lib/reading-river-homepage-data.test.ts`

**Step 1: Write the failing test**

Update the homepage-data test to require the Prisma query to select tag names.

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/reading-river-homepage-data.test.ts`

Expected: FAIL because the current query does not select tags.

**Step 3: Write minimal implementation**

- include tag names in the homepage query select
- keep `toFeaturedItem` mapping aligned with the selected shape

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/reading-river-homepage-data.test.ts`

Expected: PASS

### Task 3: Simplify the add-item flows

**Files:**
- Modify: `components/reading-river/url-intake-form.tsx`
- Modify: `components/reading-river/manual-item-form.tsx`
- Modify: `app/reading-river/actions/reading-items.ts`
- Modify: `tests/ui/add-item-flows.test.tsx`
- Create: `tests/actions/reading-item-mutations.test.ts`

**Step 1: Write the failing test**

Add assertions that:

- the URL form no longer renders a notes field
- the manual form no longer renders notes or status fields
- manual item creation defaults to `unread` when the form omits status

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/ui/add-item-flows.test.tsx tests/actions/reading-item-mutations.test.ts`

Expected: FAIL because the forms still render the removed fields and manual item creation still reads `status` from form data.

**Step 3: Write minimal implementation**

- remove the fields from both forms
- default manual item creation to `unread`

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/ui/add-item-flows.test.tsx tests/actions/reading-item-mutations.test.ts`

Expected: PASS

### Task 4: Add the reading-item edit page

**Files:**
- Create: `app/reading-river/items/[id]/edit/page.tsx`
- Create: `app/reading-river/items/[id]/edit/actions.ts`
- Modify: `lib/reading-river/routes.ts`
- Create: `tests/ui/reading-river-edit-item-page.test.tsx`
- Modify: `tests/actions/reading-item-mutations.test.ts`

**Step 1: Write the failing test**

Add assertions that:

- the edit page renders the saved item values
- the edit page shows title, estimated minutes, priority, and tags
- URL items render a source URL field
- the form omits notes and status
- saving calls the update path with normalized values

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/ui/reading-river-edit-item-page.test.tsx tests/actions/reading-item-mutations.test.ts`

Expected: FAIL because no edit route or save action exists.

**Step 3: Write minimal implementation**

- load the owned item on the edit page
- submit edits through a server action that delegates to `updateReadingItem`
- redirect back to `/reading-river` on success

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/ui/reading-river-edit-item-page.test.tsx tests/actions/reading-item-mutations.test.ts`

Expected: PASS

### Task 5: Finish styling and full verification

**Files:**
- Modify: `components/reading-river/home-read-card.tsx`
- Create: `components/reading-river/home-card-tags.tsx`
- Modify: `app/reading-river/reading-river.css`

**Step 1: Write the failing test**

Use the existing UI tests to confirm the final markup and labels after the homepage-card and edit-page changes.

**Step 2: Run test to verify it fails**

Run the targeted UI suite if any assertions still fail.

Expected: FAIL until the final structure and styling hooks are complete.

**Step 3: Write minimal implementation**

- place the edit link in the top-right of the card
- place the muted tag area in the bottom-right of the card
- add any needed layout hooks to preserve the current card composition

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/ui/reading-river-home-page.test.tsx tests/components/reading-river-home-card-tags.test.tsx tests/ui/reading-river-edit-item-page.test.tsx tests/ui/add-item-flows.test.tsx tests/actions/reading-item-mutations.test.ts tests/lib/reading-river-homepage-data.test.ts`

Expected: PASS

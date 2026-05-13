# Projects Page Contents Visual Tweak Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refine the Projects page contents box, align the Chatham House panel with the Scenario Builder project copy, and rename the first contents item/header.

**Architecture:** Keep the existing metadata-driven contents nav. Update the contents label in `PROJECT_LINKS`, adjust the first project heading text, and make targeted CSS changes for the nav width and partnership panel alignment.

**Tech Stack:** Next.js Pages Router, React, Testing Library, Vitest, CSS in `styles/globals.css`.

---

### Task 1: Cover The New Scenario Builder Label

**Files:**
- Modify: `tests/pages/projects-page.test.tsx`

**Step 1: Write the failing test**

Update the contents test to expect:

```tsx
screen.getByRole("link", { name: "Scenario Builder" })
```

and the first project heading to be:

```tsx
screen.getByRole("heading", { name: "Scenario Builder" })
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/pages/projects-page.test.tsx`

Expected: FAIL because the page still says `Chatham House future worlds` and `Scenario builder`.

### Task 2: Implement Copy And CSS

**Files:**
- Modify: `pages/projects.js`
- Modify: `styles/globals.css`

**Step 1: Update copy**

Change the first `PROJECT_LINKS` label to `Scenario Builder`, and change the first project heading to `Scenario Builder`.

**Step 2: Shrink the contents box**

Update `.project-contents` so it uses `width: fit-content` with a responsive `max-width`.

**Step 3: Lower the partnership panel**

Update `.project-hero-panel` or a Chatham-specific selector so the panel aligns lower in the row, with a small top margin.

### Task 3: Verify And Commit

**Files:**
- Modify: `pages/projects.js`
- Modify: `styles/globals.css`
- Modify: `tests/pages/projects-page.test.tsx`

**Step 1: Run focused tests**

Run: `npm test -- tests/pages/projects-page.test.tsx`

Expected: PASS.

**Step 2: Browser smoke check**

Open `/projects` in the existing dev server and confirm the page renders with no framework overlay.

**Step 3: Commit**

Stage only Projects-related hunks and commit:

```bash
git commit -m "Refine projects contents layout"
```

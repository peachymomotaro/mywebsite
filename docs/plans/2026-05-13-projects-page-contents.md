# Projects Page Contents Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a top-level project contents section to the Projects page and rename the Bayesian Optimisers anchor while preserving old links.

**Architecture:** Store project anchors in a small metadata array in `pages/projects.js`, render the contents from that array, and use matching section IDs. Keep a legacy `#capstone-bo` anchor inside the Bayesian Optimisers section for backward compatibility.

**Tech Stack:** Next.js Pages Router, React, Testing Library, Vitest, CSS in `styles/globals.css`.

---

### Task 1: Cover Contents Links And Anchors

**Files:**
- Modify: `tests/pages/projects-page.test.tsx`

**Step 1: Write the failing test**

Add assertions that the contents section contains links to:

```tsx
expect(
  screen.getByRole("navigation", { name: "Project contents" })
).toBeInTheDocument();
expect(
  screen.getByRole("link", { name: "Chatham House future worlds" })
).toHaveAttribute("href", "#chatham-house");
expect(
  screen.getByRole("link", { name: "Exploring Bayesian Optimisers" })
).toHaveAttribute("href", "#exploring-bayesian-optimisers");
expect(
  screen.getByRole("link", { name: "Reading River" })
).toHaveAttribute("href", "#reading-river");
```

Also assert the new and legacy Bayesian Optimisers anchors:

```tsx
expect(document.getElementById("exploring-bayesian-optimisers")).not.toBeNull();
expect(document.getElementById("capstone-bo")).not.toBeNull();
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/pages/projects-page.test.tsx`

Expected: FAIL because the navigation and new anchor do not exist yet.

### Task 2: Implement Contents Section

**Files:**
- Modify: `pages/projects.js`
- Modify: `styles/globals.css`

**Step 1: Add project metadata**

Add a `PROJECT_LINKS` array with labels and anchors for the three top-level projects.

**Step 2: Render the contents section**

Render a compact `<nav aria-label="Project contents">` after the hero section, with links generated from `PROJECT_LINKS`.

**Step 3: Rename the Bayesian Optimisers section anchor**

Change the section ID from `capstone-bo` to `exploring-bayesian-optimisers`. Add a small legacy anchor inside the section:

```jsx
<span id="capstone-bo" className="legacy-anchor" aria-hidden="true" />
```

**Step 4: Style the contents section**

Add CSS for the contents block and legacy anchor. Keep it compact and consistent with existing page styles.

### Task 3: Verify And Commit

**Files:**
- Modify: `pages/projects.js`
- Modify: `styles/globals.css`
- Modify: `tests/pages/projects-page.test.tsx`

**Step 1: Run focused tests**

Run: `npm test -- tests/pages/projects-page.test.tsx`

Expected: PASS.

**Step 2: Run broader relevant tests**

Run: `npm test -- tests/pages/app-layout.test.tsx tests/pages/projects-page.test.tsx`

Expected: PASS.

**Step 3: Commit**

```bash
git add pages/projects.js styles/globals.css tests/pages/projects-page.test.tsx docs/plans/2026-05-13-projects-page-contents.md
git commit -m "Add projects page contents links"
```

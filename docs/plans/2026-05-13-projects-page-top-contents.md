# Projects Page Top Contents Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move the Projects contents navigation directly below the page title, make it vertical, and move the Fizz / Chatham House intro into the Chatham House project section.

**Architecture:** Keep `PROJECT_LINKS` as the source for the contents links. Split the page title into a small page intro block, then render the contents nav, then render the Chatham House project section with the collaboration panel and scenario-builder content.

**Tech Stack:** Next.js Pages Router, React, Testing Library, Vitest, CSS in `styles/globals.css`.

---

### Task 1: Cover The New Page Order

**Files:**
- Modify: `tests/pages/projects-page.test.tsx`

**Step 1: Write the failing test**

Add assertions that:

```tsx
const projectsHeading = screen.getByRole("heading", { name: "Projects" });
const contentsNav = screen.getByRole("navigation", { name: "Project contents" });
const chathamHeading = screen.getByRole("heading", { name: "Scenario builder" });

expect(
  projectsHeading.compareDocumentPosition(contentsNav) &
    Node.DOCUMENT_POSITION_FOLLOWING
).toBeTruthy();
expect(
  contentsNav.compareDocumentPosition(chathamHeading) &
    Node.DOCUMENT_POSITION_FOLLOWING
).toBeTruthy();
```

Assert the Chatham House collaboration panel remains present:

```tsx
expect(screen.getByText("In collaboration with")).toBeInTheDocument();
expect(screen.getByRole("img", { name: "Chatham House logo" })).toHaveAttribute(
  "src",
  "/chatham-house-logo.png"
);
expect(screen.getByText(/I am currently working with The Fizz/i)).toBeInTheDocument();
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/pages/projects-page.test.tsx`

Expected: FAIL because the current Chatham House copy appears before the contents nav.

### Task 2: Restructure The Page And Vertical Nav

**Files:**
- Modify: `pages/projects.js`
- Modify: `styles/globals.css`

**Step 1: Move page title above contents**

Replace the current `project-hero` section at the top with a page-level intro containing only `h1`.

**Step 2: Move Chatham/Fizz content into the first project**

Wrap the Scenario builder project in `section className="project-hero" id="chatham-house"`, keeping the intro copy and Chatham House aside inside that section, followed by the existing scenario builder preview and lightbox.

**Step 3: Make contents vertical**

Update `.project-contents ul` to use a vertical column layout. Keep the metadata-driven rendering unchanged.

### Task 3: Verify And Commit

**Files:**
- Modify: `pages/projects.js`
- Modify: `styles/globals.css`
- Modify: `tests/pages/projects-page.test.tsx`

**Step 1: Run focused tests**

Run: `npm test -- tests/pages/projects-page.test.tsx`

Expected: PASS.

**Step 2: Commit**

```bash
git add pages/projects.js tests/pages/projects-page.test.tsx
git apply --cached <CSS hunk for project contents only>
git commit -m "Move projects contents below title"
```

Keep unrelated unstaged Bayes game edits out of the commit.

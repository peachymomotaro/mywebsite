# Site Typography Scale Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Increase the website's general font size for better readability while keeping dense controls usable.

**Architecture:** Adjust the shared typography scale in `styles/globals.css` so prose, lead copy, nav links, buttons, and secondary metadata inherit better defaults. Avoid broad changes to dense game-specific controls beyond existing inherited body text.

**Tech Stack:** Next.js Pages Router, global CSS, Vitest, agent-browser browser verification.

---

### Task 1: Update Global Type Scale

**Files:**
- Modify: `styles/globals.css`

**Step 1: Increase base text**

Set `body` font size to `1.08rem`.

**Step 2: Increase common site text**

Update:

```css
.nav-links { font-size: 1rem; }
.theme-toggle { font-size: 0.95rem; }
.small { font-size: 0.95rem; }
.lead { font-size: 1.2rem; }
.card-meta { font-size: 0.98rem; }
.button { font-size: 1rem; }
.button.button-small { font-size: 0.95rem; }
```

Keep major headings unchanged.

### Task 2: Verify

**Files:**
- Read: `tests/pages/projects-page.test.tsx`
- Read: `tests/pages/bayesgame-page.test.tsx`

**Step 1: Run focused tests**

Run:

```bash
npm test -- tests/pages/projects-page.test.tsx tests/pages/bayesgame-page.test.tsx
```

Expected: PASS.

**Step 2: Browser smoke check**

Start or reuse the dev server, then inspect:

- `http://localhost:3000/`
- `http://localhost:3000/projects`
- `http://localhost:3000/bayesgame`

Expected: pages render, no Next.js error overlay, key text is present.

### Task 3: Commit

**Files:**
- Modify: `styles/globals.css`

**Step 1: Stage and commit**

```bash
git add styles/globals.css
git commit -m "Increase site typography scale"
```

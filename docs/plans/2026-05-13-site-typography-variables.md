# Site Typography Variables Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make site font sizes easier to control centrally and increase the explicit overrides that were staying too small.

**Architecture:** Add shared typography variables in `:root`, map the common global and page-specific `font-size` declarations to those variables, and keep the Bayes game on a readable but slightly more restrained scale for dense controls.

**Tech Stack:** Global CSS, Next.js Pages Router, Vitest, agent-browser verification.

---

### Task 1: Centralize And Increase Font Sizes

**Files:**
- Modify: `styles/globals.css`

**Step 1: Add typography variables**

Add variables for base, lead, headings, UI, small, meta, tiny, and Bayes-specific text sizes.

**Step 2: Replace scattered sizes**

Replace common explicit `font-size` declarations with variables so future tuning happens at the top of the file.

**Step 3: Preserve layout-sensitive density**

Keep Bayes game controls smaller than main prose, but raise them from the current tiny values.

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

Check `/`, `/projects`, and `/bayesgame` in the browser for no framework overlay and no obvious overlap.

### Task 3: Commit

**Files:**
- Modify: `styles/globals.css`

Commit with:

```bash
git commit -m "Centralize site typography scale"
```

# Bayes Game Explanation Link Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a top-right `What’s going on?` anchor link to the Bayes game and render the Bayesian optimisation markdown at the bottom of the page.

**Architecture:** Read `Bayesian_Optimisation/Bayesian_Optimisation.md` in `getStaticProps` on the `pages/bayesgame.tsx` route, convert it with a tiny local renderer, and render it in a bottom explanation section. Style the top-right link and explanation panel in `styles/globals.css`.

**Tech Stack:** Next.js Pages Router, Node `fs/promises`, React, Testing Library, Vitest, global CSS.

---

### Task 1: Add Failing Page Test

**Files:**
- Modify: `tests/pages/bayesgame-page.test.tsx`

**Step 1: Write the failing test**

Assert:

```tsx
expect(screen.getByRole("link", { name: "What’s going on?" })).toHaveAttribute(
  "href",
  "#whats-going-on"
);
expect(
  screen.getByRole("heading", {
    name: "CapstoneBO+: Bayesian optimisation under scarce feedback",
  })
).toBeInTheDocument();
expect(screen.getByText(/What kind of data is my model causing me to collect/i)).toBeInTheDocument();
```

**Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/pages/bayesgame-page.test.tsx
```

Expected: FAIL because the link and explanation section do not exist yet.

### Task 2: Render Explanation Content

**Files:**
- Modify: `pages/bayesgame.tsx`
- Modify: `styles/globals.css`

**Step 1: Add markdown loader**

Use `getStaticProps` to read `Bayesian_Optimisation/Bayesian_Optimisation.md` and pass the raw text into `BayesGamePage`.

**Step 2: Add small renderer**

Convert the first non-empty line into an `h2`, normal blocks into paragraphs, and `---` into horizontal rules.

**Step 3: Add link and section**

Add:

```tsx
<a className="bayes-explanation-link" href="#whats-going-on">What’s going on?</a>
```

Render the explanation at the bottom:

```tsx
<section id="whats-going-on" className="bayes-explanation-section" aria-labelledby="whats-going-on-title">
  ...
</section>
```

**Step 4: Style**

Style the link as a top-right fixed pill/box. Style the explanation section as a readable dark panel below the game.

### Task 3: Verify And Commit

**Files:**
- Modify: `pages/bayesgame.tsx`
- Modify: `styles/globals.css`
- Modify: `tests/pages/bayesgame-page.test.tsx`

**Step 1: Run focused tests**

Run:

```bash
npm test -- tests/pages/bayesgame-page.test.tsx
```

Expected: PASS.

**Step 2: Browser smoke check**

Open `http://localhost:3000/bayesgame`, confirm no framework overlay, the link exists, and the bottom explanation renders.

**Step 3: Commit**

```bash
git add pages/bayesgame.tsx styles/globals.css tests/pages/bayesgame-page.test.tsx
git commit -m "Add Bayes game explanation section"
```

# Reading River Site Merge Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Merge Reading River into Peter Website as a route-contained `/reading-river/*` product inside the existing site without changing public website behavior outside that subtree.

**Architecture:** Keep the public site in `pages/` and add a dedicated `app/reading-river/` subtree for the product. Namescape Reading River code under `components/reading-river/*` and `lib/reading-river/*`, scope middleware to `/reading-river/:path*`, and keep Prisma/auth/database code confined to Reading River modules. Use checkpoint commits after each migration stage so every step is reversible.

**Tech Stack:** Next.js 16, mixed Pages Router + App Router, React, TypeScript, Vitest, Prisma, PostgreSQL, Tailwind/PostCSS

---

## Source References

Use these existing files as the source of truth while porting code:

- `/Users/petercurry/Documents/Code/Reading_River/app/*`
- `/Users/petercurry/Documents/Code/Reading_River/components/*`
- `/Users/petercurry/Documents/Code/Reading_River/lib/*`
- `/Users/petercurry/Documents/Code/Reading_River/prisma/*`
- `/Users/petercurry/Documents/Code/Reading_River/tests/*`

Do not copy Reading River into the public site root wholesale. Port only the files needed for `/reading-river/*`, rename folders to keep the product namespaced, and update every route assumption from `/...` to `/reading-river/...`.

### Task 1: Add shared tooling and route-prefix helpers

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `tsconfig.json`
- Create: `next-env.d.ts`
- Create: `vitest.config.ts`
- Create: `postcss.config.js`
- Create: `tailwind.config.ts`
- Create: `lib/reading-river/routes.ts`
- Test: `tests/lib/reading-river-routes.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { READING_RIVER_BASE_PATH, readingRiverPath } from "@/lib/reading-river/routes";

describe("readingRiverPath", () => {
  it("keeps Reading River route generation under a fixed prefix", () => {
    expect(READING_RIVER_BASE_PATH).toBe("/reading-river");
    expect(readingRiverPath("")).toBe("/reading-river");
    expect(readingRiverPath("/login")).toBe("/reading-river/login");
    expect(readingRiverPath("admin")).toBe("/reading-river/admin");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/reading-river-routes.test.ts`
Expected: FAIL because Vitest/TypeScript route scaffolding does not exist yet.

**Step 3: Write minimal implementation**

- Upgrade `package.json` to the combined dependency set needed by the public site and Reading River:
  - `next`, `react`, `react-dom`
  - `typescript`, `vitest`, `@testing-library/*`, `jsdom`
  - `prisma`, `@prisma/client`, `@prisma/adapter-pg`, `pg`
  - `tailwindcss`, `@tailwindcss/postcss`, `autoprefixer`
  - existing website dependencies such as `rss-parser`
- Add `tsconfig.json` with the `@/*` path alias rooted at the repo root.
- Add `vitest.config.ts` and test environment setup compatible with `jsdom`.
- Add `postcss.config.js` and `tailwind.config.ts`.
- Create `lib/reading-river/routes.ts` with a single source of truth:

```ts
export const READING_RIVER_BASE_PATH = "/reading-river";

export function readingRiverPath(path = "") {
  if (!path || path === "/") {
    return READING_RIVER_BASE_PATH;
  }

  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${READING_RIVER_BASE_PATH}${normalized}`;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/reading-river-routes.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add package.json package-lock.json tsconfig.json next-env.d.ts vitest.config.ts postcss.config.js tailwind.config.ts lib/reading-river/routes.ts tests/lib/reading-river-routes.test.ts
git commit -m "chore: add reading river merge scaffolding"
```

### Task 2: Add the app router root and website nav entry

**Files:**
- Create: `app/layout.tsx`
- Create: `app/reading-river/page.tsx`
- Modify: `components/NavBar.js`
- Test: `tests/components/navbar.test.tsx`

**Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import NavBar from "@/components/NavBar";

describe("NavBar", () => {
  it("links to Reading River from the main site navigation", () => {
    render(<NavBar />);
    expect(screen.getByRole("link", { name: "Reading River" })).toHaveAttribute(
      "href",
      "/reading-river"
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/navbar.test.tsx`
Expected: FAIL because the nav link does not exist yet.

**Step 3: Write minimal implementation**

- Add a minimal `app/layout.tsx` that only satisfies App Router requirements and does not wrap or restyle the legacy `pages/` site.
- Add the `Reading River` link to `components/NavBar.js`.
- Create `app/reading-river/page.tsx` as a temporary stub route that returns a lightweight placeholder while the full port is still in progress.

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/navbar.test.tsx && npm run build`
Expected: PASS, and the site still builds with a minimal App Router root present.

**Step 5: Commit**

```bash
git add app/layout.tsx app/reading-river/page.tsx components/NavBar.js tests/components/navbar.test.tsx
git commit -m "feat: add reading river entry route"
```

### Task 3: Port the Reading River shell and route-scoped styling

**Files:**
- Create: `app/reading-river/layout.tsx`
- Create: `app/reading-river/reading-river.css`
- Create: `components/reading-river/shell-nav.tsx`
- Modify: `app/reading-river/page.tsx`
- Test: `tests/app/reading-river-shell.test.tsx`

**Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { EditorialShell } from "@/app/reading-river/layout";

describe("EditorialShell", () => {
  it("keeps Reading River navigation inside the prefixed route space", () => {
    render(<EditorialShell isAdmin={true}><div>child</div></EditorialShell>);

    expect(screen.getByRole("link", { name: "Reading River" })).toHaveAttribute(
      "href",
      "/reading-river"
    );
    expect(screen.getByRole("link", { name: "Read history" })).toHaveAttribute(
      "href",
      "/reading-river/history"
    );
    expect(screen.getByRole("link", { name: "Admin" })).toHaveAttribute(
      "href",
      "/reading-river/admin"
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/app/reading-river-shell.test.tsx`
Expected: FAIL because the layout and prefix-aware shell are not implemented yet.

**Step 3: Write minimal implementation**

- Port the Reading River shell from `/Users/petercurry/Documents/Code/Reading_River/app/layout.tsx`.
- Rename imports into the namespaced target paths.
- Port `Reading_River/app/globals.css` into `app/reading-river/reading-river.css`.
- Import the CSS from `app/reading-river/layout.tsx` so styles load only when the Reading River subtree is active.
- Update the shell nav and brand links to use `readingRiverPath(...)` instead of hardcoded root routes.

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/app/reading-river-shell.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add app/reading-river/layout.tsx app/reading-river/reading-river.css app/reading-river/page.tsx components/reading-river/shell-nav.tsx tests/app/reading-river-shell.test.tsx
git commit -m "feat: port reading river shell"
```

### Task 4: Port Prisma and database configuration

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/migrations/0_init/*`
- Create: `prisma/migrations/202604011700_beta_accounts_legacy_owner/*`
- Create: `lib/reading-river/database-connection.ts`
- Create: `lib/reading-river/db.ts`
- Create: `.env.example`
- Test: `tests/schema/app-settings.test.ts`
- Test: `tests/schema/auth-models.test.ts`
- Test: `tests/schema/beta-auth-migration.test.ts`

**Step 1: Write the failing test**

Use the existing Reading River schema tests as the starting point:

```ts
import { readFileSync } from "node:fs";

describe("prisma schema", () => {
  it("defines user, session, invite, and reading item models", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8");

    expect(schema).toContain("model User");
    expect(schema).toContain("model Session");
    expect(schema).toContain("model Invite");
    expect(schema).toContain("model ReadingItem");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/schema/app-settings.test.ts tests/schema/auth-models.test.ts tests/schema/beta-auth-migration.test.ts`
Expected: FAIL because the Prisma files do not exist yet.

**Step 3: Write minimal implementation**

- Port the Reading River Prisma directory from `/Users/petercurry/Documents/Code/Reading_River/prisma/`.
- Port `Reading_River/lib/database-connection.ts` and `Reading_River/lib/db.ts` into `lib/reading-river/`.
- Add `.env.example` documenting `DATABASE_URL`, `DATABASE_SSL_NO_VERIFY`, `SESSION_COOKIE_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_DISPLAY_NAME`.
- Keep the database code inside `lib/reading-river/*`; do not import it from public website pages.

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/schema/app-settings.test.ts tests/schema/auth-models.test.ts tests/schema/beta-auth-migration.test.ts && npx prisma validate`
Expected: PASS, and Prisma reports the schema is valid.

**Step 5: Commit**

```bash
git add prisma lib/reading-river/database-connection.ts lib/reading-river/db.ts .env.example tests/schema/app-settings.test.ts tests/schema/auth-models.test.ts tests/schema/beta-auth-migration.test.ts
git commit -m "feat: add reading river prisma schema"
```

### Task 5: Port auth, sessions, invites, and prefix-safe login flows

**Files:**
- Create: `lib/reading-river/auth.ts`
- Create: `lib/reading-river/session.ts`
- Create: `lib/reading-river/current-user.ts`
- Create: `lib/reading-river/invites.ts`
- Create: `app/reading-river/login/page.tsx`
- Create: `app/reading-river/login/actions.ts`
- Create: `app/reading-river/invite/page.tsx`
- Create: `app/reading-river/invite/actions.ts`
- Create: `app/reading-river/invite/[token]/page.tsx`
- Create: `app/reading-river/invite/[token]/actions.ts`
- Create: `app/reading-river/logout/route.ts`
- Test: `tests/auth/auth-session.test.ts`
- Test: `tests/auth/login-action.test.ts`
- Test: `tests/auth/invites.test.ts`
- Test: `tests/auth/session-store.test.ts`

**Step 1: Write the failing test**

Port the existing auth tests and update them to expect prefixed redirects:

```ts
expect(redirectTarget).toBe("/reading-river/login");
expect(successTarget).toBe("/reading-river");
expect(inviteTarget).toBe("/reading-river/invite");
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/auth/auth-session.test.ts tests/auth/login-action.test.ts tests/auth/invites.test.ts tests/auth/session-store.test.ts`
Expected: FAIL because auth modules and prefixed routes are not present yet.

**Step 3: Write minimal implementation**

- Port the auth/session/invite files from `/Users/petercurry/Documents/Code/Reading_River/lib/`.
- Port the login, invite, token redemption, and logout routes from `/Users/petercurry/Documents/Code/Reading_River/app/`.
- Replace every hardcoded redirect such as `redirect("/login")` or `redirect("/")` with `redirect(readingRiverPath("/login"))` or `redirect(readingRiverPath())`.
- Keep cookie names and session handling inside Reading River helper files.

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/auth/auth-session.test.ts tests/auth/login-action.test.ts tests/auth/invites.test.ts tests/auth/session-store.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/reading-river/auth.ts lib/reading-river/session.ts lib/reading-river/current-user.ts lib/reading-river/invites.ts app/reading-river/login app/reading-river/invite app/reading-river/logout tests/auth/auth-session.test.ts tests/auth/login-action.test.ts tests/auth/invites.test.ts tests/auth/session-store.test.ts
git commit -m "feat: port reading river auth flows"
```

### Task 6: Port the product routes, actions, and UI modules

**Files:**
- Create: `app/reading-river/add/page.tsx`
- Create: `app/reading-river/history/page.tsx`
- Create: `app/reading-river/admin/page.tsx`
- Create: `app/reading-river/admin/actions.ts`
- Create: `app/reading-river/beta/page.tsx`
- Create: `app/reading-river/books/new/page.tsx`
- Create: `app/reading-river/actions/books.ts`
- Create: `app/reading-river/actions/ingest-url.ts`
- Create: `app/reading-river/actions/reading-items.ts`
- Create: `components/reading-river/add-item-tabs.tsx`
- Create: `components/reading-river/book-form.tsx`
- Create: `components/reading-river/chapter-list-editor.tsx`
- Create: `components/reading-river/filter-bar.tsx`
- Create: `components/reading-river/home-read-card.tsx`
- Create: `components/reading-river/manual-item-form.tsx`
- Create: `components/reading-river/reading-item-card.tsx`
- Create: `components/reading-river/reading-stream.tsx`
- Create: `components/reading-river/time-budget-picker.tsx`
- Create: `components/reading-river/url-intake-form.tsx`
- Create: `lib/reading-river/article-extraction.ts`
- Create: `lib/reading-river/article-length-estimation.ts`
- Create: `lib/reading-river/homepage-data.ts`
- Create: `lib/reading-river/ranking.ts`
- Create: `lib/reading-river/reading-config.ts`
- Create: `lib/reading-river/reading-time.ts`
- Create: `lib/reading-river/settings.ts`
- Create: `lib/reading-river/utils.ts`
- Create: `lib/reading-river/validators/reading-item.ts`
- Create: `lib/reading-river/word-count.ts`
- Test: `tests/actions/books-action.test.ts`
- Test: `tests/actions/ingest-url.test.ts`
- Test: `tests/actions/reading-items.test.ts`
- Test: `tests/actions/url-intake-action.test.ts`
- Test: `tests/lib/article-length-estimation.test.ts`
- Test: `tests/ui/add-item-flows.test.tsx`

**Step 1: Write the failing test**

Start by porting the existing Reading River tests and updating route expectations where needed:

```ts
expect(screen.getByRole("link", { name: "Add to stream" })).toHaveAttribute(
  "href",
  "/reading-river/add"
);
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/actions/books-action.test.ts tests/actions/ingest-url.test.ts tests/actions/reading-items.test.ts tests/actions/url-intake-action.test.ts tests/lib/article-length-estimation.test.ts tests/ui/add-item-flows.test.tsx`
Expected: FAIL because the product routes, components, and lib modules are not ported yet.

**Step 3: Write minimal implementation**

- Port the Reading River route files from `/Users/petercurry/Documents/Code/Reading_River/app/`.
- Port the matching components and lib modules into namespaced folders.
- Update imports from `@/components/...` and `@/lib/...` to point to `@/components/reading-river/...` and `@/lib/reading-river/...`.
- Replace hardcoded hrefs such as `href="/add"` with `href={readingRiverPath("/add")}`.
- Keep public-site code untouched except for the main nav link already added in Task 2.

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/actions/books-action.test.ts tests/actions/ingest-url.test.ts tests/actions/reading-items.test.ts tests/actions/url-intake-action.test.ts tests/lib/article-length-estimation.test.ts tests/ui/add-item-flows.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add app/reading-river/add app/reading-river/history app/reading-river/admin app/reading-river/beta app/reading-river/books app/reading-river/actions components/reading-river lib/reading-river tests/actions tests/lib tests/ui
git commit -m "feat: port reading river product routes"
```

### Task 7: Add middleware and final isolation checks

**Files:**
- Create: `middleware.ts`
- Test: `tests/auth/middleware.test.ts`
- Modify: `lib/reading-river/routes.ts`
- Modify: `README.md`

**Step 1: Write the failing test**

```ts
it("ignores public site routes and protects only Reading River pages", async () => {
  expect(await runMiddleware("https://example.com/about")).toBe("next");
  expect(await runMiddleware("https://example.com/reading-river")).toBe(
    "redirect:https://example.com/reading-river/login"
  );
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/auth/middleware.test.ts`
Expected: FAIL because the shared middleware file does not exist yet.

**Step 3: Write minimal implementation**

- Port the logic from `/Users/petercurry/Documents/Code/Reading_River/middleware.ts`.
- Change public-path checks to target `/reading-river/*` routes rather than root routes.
- Match only the Reading River subtree in `config.matcher`.
- Update `README.md` with merged-project setup, Prisma commands, env vars, and the known pre-existing lint-script issue.

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/auth/middleware.test.ts && npm run build`
Expected: PASS, and the site builds with middleware scoped only to Reading River.

**Step 5: Commit**

```bash
git add middleware.ts lib/reading-river/routes.ts README.md tests/auth/middleware.test.ts
git commit -m "feat: scope middleware to reading river routes"
```

### Task 8: Run full verification and capture the final checkpoint

**Files:**
- Modify: `README.md`
- Modify: `docs/plans/2026-04-01-reading-river-site-merge.md`

**Step 1: Verify the full test and build surface**

Run: `npx vitest run`
Expected: PASS

**Step 2: Verify Prisma schema health**

Run: `npx prisma validate`
Expected: `The schema at prisma/schema.prisma is valid`

**Step 3: Verify production build**

Run: `npm run build`
Expected: PASS, with the public site routes and `/reading-river/*` routes both compiling successfully.

**Step 4: Record any remaining gaps**

- If `npm run lint` is still broken because of the existing repo script, document that explicitly in `README.md`.
- If any Reading River tests remain flaky after the port, note the exact failing files and stop before claiming success.

**Step 5: Commit**

```bash
git add README.md docs/plans/2026-04-01-reading-river-site-merge.md
git commit -m "chore: finalize reading river merge verification"
```

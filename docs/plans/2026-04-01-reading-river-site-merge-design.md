# Reading River Site Merge Design

**Date:** 2026-04-01
**Status:** Approved
**Owner:** Peter Website feature branch `feature/reading-river-site-merge`

## Goal

Merge `Reading_River` into `Peter Website` so the site deploys as one Next.js project and exposes Reading River as a first-class top-level tab, while keeping the Reading River product isolated from the rest of the website.

## Constraints

- `Reading_River` must not affect the behavior of the public website outside its own route space.
- The merged project should use one Next.js deployment.
- The public website should remain public and stable.
- Reading River auth, sessions, middleware, database access, and product styles should stay scoped to Reading River routes.
- We want safe rollback points throughout the work.

## Recommended Architecture

Use one Next.js project with both routers at once:

- Keep the existing public site in `pages/`
- Add Reading River in `app/reading-river/`
- Keep Reading River code namespaced in dedicated folders such as `components/reading-river/` and `lib/reading-river/`
- Keep Prisma and env-driven infrastructure at the repo root
- Add a shared `middleware.ts` that only protects `/reading-river/:path*`

This keeps one deployment and one domain while preserving a strong internal boundary between the public site and the product app.

## Route Structure

The public site keeps its existing routes:

- `/`
- `/about`
- `/blog`
- `/projects`
- `/podcasts`
- `/contact`

Reading River moves under a route prefix:

- `/reading-river`
- `/reading-river/add`
- `/reading-river/history`
- `/reading-river/login`
- `/reading-river/invite`
- `/reading-river/invite/[token]`
- `/reading-river/admin`
- `/reading-river/beta`
- `/reading-river/logout`

The top site nav will gain a `Reading River` link to `/reading-river`.

## Isolation Rules

Reading River should behave like a sealed product zone inside the combined repo:

- Public site pages continue to use the existing `pages/` router and layout.
- Reading River gets its own `app/reading-river/layout.tsx` shell.
- Reading River code does not import public-site components or page modules.
- The public site does not consume Reading River auth, session, database, or Prisma code.
- Middleware only matches the `/reading-river` subtree.
- Reading River redirects, links, and pathname checks must all be prefix-safe.
- Reading River styles stay in its own CSS files and component classes rather than altering the website stylesheet.

## Data and Auth

- The merged project uses one deployment.
- Reading River keeps its own PostgreSQL database tables and Prisma schema.
- Reading River env vars such as `DATABASE_URL` remain project-level deployment configuration, but only Reading River code reads them.
- Website pages must still render even when no Reading River session exists.

## Migration Strategy

Implement the merge in phases:

1. Prepare the target repo for a mixed `pages/` + `app/` setup, TypeScript, and Reading River dependencies.
2. Move Reading River into the `Peter Website` repo under namespaced folders and `app/reading-river/*`.
3. Rewrite Reading River routes, redirects, middleware, and navigation to use the `/reading-river` prefix.
4. Add Prisma, env configuration, and any supporting build/test setup needed by Reading River.
5. Add the top-level website nav link to `/reading-river`.
6. Verify that both the public website and Reading River work without crossing boundaries.

## Operational Safety

- All implementation work happens on `feature/reading-river-site-merge` in a dedicated worktree.
- Use frequent checkpoint commits so each migration stage is reversible.
- Confirm baseline health before major edits. At the time of design approval:
  - `npm run build` passes in `Peter Website`
  - `npm run lint` fails because the current repo lint command is misconfigured and does not run a real lint pass

## Success Criteria

- `Peter Website` and `Reading_River` ship as one deployed Next.js project.
- The public website remains unaffected outside the `/reading-river/*` subtree.
- Reading River is reachable from the main site navigation.
- Reading River auth, database access, and middleware only affect Reading River routes.
- The merged codebase has clear rollback points and enough verification to catch route or isolation regressions early.

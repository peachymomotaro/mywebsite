# Peter Website

`Peter Website` now hosts the public site and the embedded `Reading River` product in one Next.js project.

## Routes

- Public site: `pages/`
- Reading River app: `app/reading-river/`

Reading River is intentionally isolated under `/reading-river/*`, including auth, sessions, Prisma access, and middleware.

## Environment

Copy `.env.example` and provide at least:

- `DATABASE_URL`
- `DATABASE_SSL_NO_VERIFY`
- `SESSION_COOKIE_NAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_DISPLAY_NAME`

## Development

Install dependencies:

```bash
npm install
```

Validate the Prisma schema:

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/reading_river npx prisma validate
```

Run the test suite:

```bash
npm test
```

Start the app:

```bash
npm run dev
```

## Notes

- The public website should remain unaffected outside `/reading-river/*`.
- `middleware.ts` only protects the Reading River subtree.
- `npm run lint` is still a known repo issue and does not currently run a meaningful lint pass under this Next.js version.

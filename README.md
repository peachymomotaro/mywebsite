# Peter Website

`Peter Website` now hosts the public site and the embedded `Reading River` product in one Next.js project.

## Routes

- Public site: `pages/`
- Reading River app: `app/reading-river/`

Reading River is intentionally isolated under `/reading-river/*`, including auth, sessions, Prisma access, and proxy routing.

## Environment

Copy `.env.example` and provide at least:

- `DATABASE_URL`
- `DATABASE_SSL_NO_VERIFY`
- `SESSION_COOKIE_NAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_DISPLAY_NAME`
- `READING_RIVER_BASE_URL`
- `CRON_SECRET`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

Recommended values:

- `READING_RIVER_BASE_URL=https://petercurry.org`
- `CRON_SECRET=replace-me-with-a-long-random-secret`
- `RESEND_API_KEY=re_123`
- `RESEND_FROM_EMAIL=Reading River <invites@mail.petercurry.org>`

The shared daily digest send time is `08:00 London time`. `vercel.json` uses `07:00 UTC` and `08:00 UTC` cron triggers so the job fires correctly across GMT and BST.

For local manual testing, hit `http://localhost:3000/api/reading-river/daily-digest` with `Authorization: Bearer <CRON_SECRET>`. The route is time-gated and will return a skipped/outside-window response outside the `08:00 London time` window.

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
- `proxy.ts` only protects the Reading River subtree.
- `npm run lint` is still a known repo issue and does not currently run a meaningful lint pass under this Next.js version.

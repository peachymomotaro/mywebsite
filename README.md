# Peter Website

`Peter Website` now hosts the public site and the embedded `Reading River` product in one Next.js project.

## Routes

- Public site: `pages/`
- Reading River app: `app/reading-river/`

Reading River is intentionally isolated under `/reading-river/*`, including auth, sessions, Prisma access, and proxy routing.

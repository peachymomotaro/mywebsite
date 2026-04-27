# Peter Website

`Peter Website` now hosts the public site and the embedded `Reading River` product in one Next.js project.

## Routes

- Public site: `pages/`
- Reading River app: `app/reading-river/`

Reading River is intentionally isolated under `/reading-river/*`, including auth, sessions, Prisma access, and proxy routing.

git push origin HEAD:main pushes to main branch.

If Git rejects because main has newer commits, do this safer route:

git fetch origin
git switch main
git pull --ff-only origin main
git merge reading-river-url-prefill-local-wip
git push origin main
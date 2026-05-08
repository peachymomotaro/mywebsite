# Peter Website

`Peter Website` now hosts the public site and the embedded `Reading River` product in one Next.js project.

## Routes

- Public site: `pages/`
- Reading River app: `app/reading-river/`

Reading River is intentionally isolated under `/reading-river/*`, including auth, sessions, Prisma access, and proxy routing.

git push origin HEAD:main 

pushes to main branch.

If Git rejects because main has newer commits:

git fetch origin
git switch main
git pull --ff-only origin main
git merge reading-river-url-prefill-local-wip
git push origin main

Use rg (ripgrep) from the repo root.

Examples:

rg "specific phrase"

Search only Reading River:
rg "specific phrase" app/reading-river components/reading-river lib/reading-river

Search case-insensitively:
rg -i "specific phrase"

Show line numbers, file names are included by default:
rg -n "specific phrase"

Search for exact text with punctuation safely:
rg -F "Changed manual items to books"

Search TypeScript/React files only:
rg "Book Roulette" -g "*.ts" -g "*.tsx"
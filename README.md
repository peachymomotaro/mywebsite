# Peter Website

`Peter Website` hosts the public site and POps in one Next.js project.

## Routes

- Public site: `pages/`
- POps (private task management for ChatGPT and Claude): `app/pops/`, `lib/pops/`, `app/api/pops/` — see [POPS.md](POPS.md)
- Reading River (`/reading-river/*`): **lives in its own repository and Vercel project,
  [peachymomotaro/reading-river](https://github.com/peachymomotaro/reading-river).**
  `next.config.ts` forwards `/reading-river/*`, `/api/reading-river/*` and
  `/reading-river-static/*` to it, so it still appears at petercurry.org.

What's left of Reading River here:

- `lib/reading-river/` keeps four small helpers that POps and the name ranker
  share: the database client (`db.ts`, `database-connection.ts`), password
  hashing (`auth.ts`) and rate limits (`rate-limit.ts`).
- `prisma/schema.prisma` still lists Reading River's tables, because they share
  the database. **Don't change them or migrate them from this repo**; the
  comment in the schema explains why.
- `public/` keeps Reading River's images (logo, icons, background and the
  paintings used in emails), which its pages and past emails load from
  petercurry.org.

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

Search only POps:
rg "specific phrase" app/pops lib/pops app/api/pops

Search case-insensitively:
rg -i "specific phrase"

Show line numbers, file names are included by default:
rg -n "specific phrase"

Search for exact text with punctuation safely:
rg -F "Changed manual items to books"

Search TypeScript/React files only:
rg "Book Roulette" -g "*.ts" -g "*.tsx"

Run local servers: From Peter Website:

npm run dev

http://localhost:3000

Locally, /reading-river is forwarded to the live Reading River project. To work
on Reading River itself, run it from its own repository instead.

Shows everything listening on local ports:

lsof -iTCP -sTCP:LISTEN -n -P

To kill a specific port, e.g. 3000:

lsof -ti :3000 | xargs kill

If it refuses to die:

lsof -ti :3000 | xargs kill -9

Reading River's changelog is in its own repository:
lib/reading-river/changelog.ts in peachymomotaro/reading-river

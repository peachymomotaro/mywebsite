# POps V1

POps is a private task manager at `/pops` designed around one principle: **minimise the human work remaining**, not maximise AI output. POps itself is a conventional web app. ChatGPT does the reasoning and research through reusable *pipelines*, and writes structured results back.

It replaces the retired Canon Explorer (`/qb`).

## Workflow

1. Create a task in POps, or ask ChatGPT to create one (API/MCP).
2. On the task page, pick a pipeline. POps generates a complete prompt: task context, previous runs, decisions, notes, pipeline instructions (versioned), the shared playbook, foundational permission boundaries, and write-back instructions with an idempotency key.
3. Paste it into any ChatGPT conversation. ChatGPT does the work.
4. ChatGPT writes back, either directly (Custom GPT action / MCP) or by ending its reply with a `pops-report` block that you paste into the task page.
5. POps shows the run in the task history, opens any decisions, and updates the suggested next action.
6. You answer decisions, give feedback on runs, and launch the next pipeline. The next prompt carries everything forward.

Agent runs **never** change a task's status. Only you complete or archive tasks.

## Where things are

| Area | Path |
| --- | --- |
| Pages | `app/pops/(app)/…` (owner-only), `app/pops/login` |
| Server actions | `app/pops/actions.ts` (each calls `requireOwner()`) |
| Domain logic | `lib/pops/` — `tasks.ts`, `runs.ts`, `library.ts` (pipelines, playbook, proposals), `prompt.ts`, `context.ts`, `validation.ts` |
| Agent API | `app/api/pops/v1/…` (REST), `app/api/pops/mcp` (MCP), `lib/pops/agent-ops.ts` (shared by both) |
| Default pipelines and playbook | `lib/pops/defaults.ts` (seeded on first use only) |
| Schema | `prisma/schema.prisma` (`Pops*` models), migration `20261106120000_pops_v1` |
| Tests | `tests/pops/*`, `tests/integration/pops.test.ts` |

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes (existing) | Shared Postgres. POps adds tables only. |
| `POPS_PASSWORD_HASH` | recommended | scrypt hash of the owner password, in the same format as Reading River. Generate with `npx tsx -e 'import("./lib/reading-river/auth").then(async m => console.log(await m.hashPassword(process.argv[1])))' 'your password'`. |
| `POPS_PASSWORD` | fallback | Plain password, compared in constant time. |
| `QB_PASSWORD` | legacy | Honoured only when neither of the above is set, so the existing password keeps working on first deploy. Remove once `POPS_PASSWORD_HASH` is set. |
| `POPS_BASE_URL` | optional | Absolute base for links in prompts and API responses. Defaults to `https://petercurry.org`. |

`OPENAI_API_KEY` is no longer used anywhere: the QB extractor was its only consumer and the `openai` package has been removed. POps introduces no paid LLM dependency.

## Database migration

`prisma/migrations/20261106120000_pops_v1/migration.sql` is additive only: new enums, new `Pops*` tables, indexes, foreign keys between POps tables, and triggers. It does not alter or drop any existing table (a test enforces this). Deploy with the existing process:

```bash
npx prisma migrate deploy
```

The migration also installs `BEFORE UPDATE OR DELETE` triggers that make `PopsHistoryEntry`, `PopsAgentRun`, `PopsPipelineVersion` and `PopsPlaybookVersion` append-only. Corrections are new rows. Consequently tasks can be archived but not deleted.

**Rollback:** the feature is self-contained. Reverting the code leaves unused `Pops*` tables behind, which is harmless. To remove them entirely, drop the `Pops*` tables, the `Pops*` enum types and the `pops_reject_mutation()` function, then delete the migration row from `_prisma_migrations`.

Pipelines and the playbook are seeded lazily on first use when their tables are empty. No tasks are ever seeded in production.

## Connecting ChatGPT

Findings from November 2026: ChatGPT supports remote MCP servers with write actions through developer-mode custom connectors (Plus/Pro and above). Those connectors reliably support OAuth or no authentication; bearer/API-key support is inconsistent. Custom GPT *actions* (OpenAPI) do support API-key bearer authentication. POps therefore offers three paths, all sharing one validation layer:

1. **Copy and paste — works everywhere, no setup.** Generate a prompt, paste ChatGPT's `pops-report` block back into the task page. Import is idempotent.
2. **Custom GPT action — recommended for direct write-back today.** In the GPT editor, add an action, import `https://petercurry.org/api/pops/v1/openapi.json`, choose *API key → Bearer*, and paste a credential from `/pops/connect`. ChatGPT asks for confirmation before write actions.
3. **MCP — `https://petercurry.org/api/pops/mcp`.** A small stateless Streamable-HTTP MCP server (JSON responses, no SSE) exposing `pops_list_tasks`, `pops_get_task`, `pops_get_pipeline_prompt`, `pops_list_pipelines`, `pops_get_playbook`, `pops_create_task`, `pops_record_agent_run`, `pops_create_decision`, `pops_relay_feedback`, `pops_propose`. Works today with MCP clients that send a bearer token (Claude Code, Codex, scripts). **For ChatGPT developer mode it needs OAuth, which V1 does not implement** (see limitations).

### REST API

All routes require `Authorization: Bearer pops_…` and return JSON with `Cache-Control: no-store`.

| Method | Path | Scope |
| --- | --- | --- |
| GET | `/api/pops/v1/tasks?workspace=&status=&tag=` | `tasks:read` |
| POST | `/api/pops/v1/tasks` | `tasks:write` — `idempotencyKey` optional |
| GET | `/api/pops/v1/tasks/{id}` | `tasks:read` — full context for the next agent |
| GET | `/api/pops/v1/tasks/{id}/prompt?pipeline=` | `tasks:read` |
| POST | `/api/pops/v1/tasks/{id}/runs` | `runs:write` — idempotent; 409 if a key is reused with different content |
| POST | `/api/pops/v1/tasks/{id}/decisions` | `decisions:write` |
| POST | `/api/pops/v1/runs/{id}/feedback` | `feedback:write` — recorded as *relayed* |
| POST | `/api/pops/v1/proposals` | `proposals:write` |
| GET | `/api/pops/v1/pipelines`, `/api/pops/v1/playbook` | `tasks:read` |
| GET | `/api/pops/v1/openapi.json` | public (schema only, no data) |

## Security boundaries

- **Owner sessions.** Login at `/pops/login` creates a random 256-bit session token; only its SHA-256 is stored in `PopsSession`. Cookie `pops_session`: `HttpOnly`, `SameSite=Lax`, `Secure` in production, 30 days. Logout revokes server-side. The raw-password `qb_auth` cookie is gone and grants nothing.
- **Login throttling.** 10 attempts per IP per 15 minutes, reusing the site's `RateLimitBucket`.
- **Defence in depth.** `proxy.ts` only checks that a POps cookie exists; the `(app)` layout and *every* server action call `requireOwner()`, which validates against the database. Reading River and POps cookies are independent.
- **Agent credentials.** Created at `/pops/connect`, shown once, stored as SHA-256, scoped, revocable, with `lastUsedAt`. A browser session cookie does not authorise the API.
- **Agent writes are validated** with Zod (`lib/pops/validation.ts`): size limits, enumerations, `http(s)`/`obsidian` URLs only, Anki id format, 256 KB body cap.
- **Idempotency.** Runs are keyed by `idempotencyKey` (unique) plus a content hash; history entries carry unique `dedupeKey`s inserted with `ON CONFLICT DO NOTHING`. Concurrent replays are tested.
- **Completion is human-only.** The run schema has no status field; unknown fields are stripped. Agent activity never updates `lastHumanEngagementAt`.
- **Instruction integrity.** Foundational permission boundaries live in code (`FOUNDATIONAL_BOUNDARIES`), are shown read-only on the playbook page, and are placed *after* the playbook in every prompt. Agents can only create proposals; the playbook and pipelines change only when the owner saves a new version, and accepted proposals are linked from the version that applied them.
- **No public exposure.** `/pops` and `/api/pops` are `noindex` and disallowed in robots. Only the OpenAPI schema is public.
- **Links** from agents render with `rel="noopener noreferrer nofollow"`; `javascript:` and other schemes are rejected at validation and again at render.

## Anki and the Quiz Trainer

The `learn-textbook-anki` pipeline asks for cards in the Quiz Trainer inbox format (`{"version":1,"id","deck","front","back"}`, deck `Learning::1Injection::ButtressCards`), in the user's detailed style with a cited `Further reading:` section. Cards appear on the run with *Copy inbox JSON* buttons. ChatGPT may write them to `peachymomotaro/Quiz-Trainer-App/chatgpt/anki-inbox/<id>.json` via its GitHub connector **only when you confirm in the conversation**; the existing add-on then imports them. POps does not build a flashcard app.

## Obsidian

Notes and evidence accept `obsidian://` links, which are carried into prompts. Pipelines and boundaries forbid writing to the vault. A future read-only integration could add a `PopsTask.obsidianPaths` field and a local exporter; nothing in V1 reads the vault.

## Resurfacing

Active tasks untouched by a human for 14 days, and paused tasks for 45, appear (max three) under *Not touched for a while* on the Everything and workspace pages, with *Still relevant*, *Not now* (21-day snooze) and *Archive*. Completed and archived tasks never resurface. No email or notifications.

## Testing

```bash
npm test                                   # unit tests; integration tests skip
docker run -d --name pops-pg -e POSTGRES_USER=pops -e POSTGRES_PASSWORD=pops \
  -e POSTGRES_DB=pops_test -p 127.0.0.1:54329:5432 postgres:16-alpine
DATABASE_URL=postgresql://pops:pops@127.0.0.1:54329/pops_test npx prisma migrate deploy
POPS_TEST_DATABASE_URL=postgresql://pops:pops@127.0.0.1:54329/pops_test npm test
```

The integration suite refuses any database other than a local `pops_test`. It covers authentication and scopes, task creation/editing, run import and replay (including concurrent replays), append-only triggers, completion separation, decisions, feedback and ranking, resurfacing, versioning, proposals, MCP, and the full workflow for one representative task in each workspace.

For a local demo with representative tasks (refuses any database that is not local and named `*demo*`):

```bash
createdb … pops_demo   # or use the container above
DATABASE_URL=postgresql://pops:pops@127.0.0.1:54329/pops_demo npx prisma migrate deploy
DATABASE_URL=postgresql://pops:pops@127.0.0.1:54329/pops_demo npx tsx scripts/pops-demo-seed.ts
DATABASE_URL=postgresql://pops:pops@127.0.0.1:54329/pops_demo POPS_PASSWORD=local-demo-password npm run dev
```

## Trade-offs (smallest reversible choices)

- **No OAuth server.** Building one is the largest piece of work in the ChatGPT-MCP path and can be added later without changing data or tools. Copy/paste and Custom GPT actions cover the workflow now.
- **Shared database, single owner, no user FK.** Matches "only the site owner"; adding an owner id later is a simple migration.
- **Pipeline name/summary/workspace are not versioned**, only instructions and expected evidence (what agents execute).
- **Lazy seeding** of templates rather than a data migration, so editing or archiving templates is never undone.
- **307 redirect from `/qb`**, not 308, so browsers do not cache it if the change is reversed.

## Known limitations

- ChatGPT developer-mode MCP connectors need OAuth; until it is added, use the Custom GPT action or copy/paste.
- One owner session store with no "log out everywhere" button (revoke by deleting `PopsSession` rows).
- No full-text search across tasks; the Everything view filters by status and tag.
- Feedback informs ranking and is fed into prompts, but there is no automatic pipeline rewriting (by design).
- Copy buttons use the Clipboard API. If the browser blocks it, the button says so; the prompt page's text can still be selected by hand, but the decision copy text is not shown separately.

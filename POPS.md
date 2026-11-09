# POps

POps is a private task manager at `/pops` designed around one principle: **minimise the human work remaining**, not maximise AI output. POps itself is a conventional web app. Agents do the reasoning and research through reusable *pipelines*, and write structured results back.

It replaces the retired Canon Explorer (`/qb`).

## Workflow

1. Create a task in POps, or ask an agent to create one (API/MCP). Agents can also edit task titles, descriptions, and tags when asked.
2. On the task page, copy the **task status** by default: a portable factual record of its description, prior runs, decisions and notes, without instructions for executing anything.
3. Paste the status into an agent and supply your own instructions, **or** attach an explicit reusable workflow. The attached workflow adds versioned instructions, the shared playbook, permission boundaries and reporting instructions with an idempotency key.
4. The agent writes back, either directly (MCP or an OpenAPI action) or by ending its reply with a `pops-report` block that you paste into the task page.
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

## Connecting agents

Agents connect to a single Streamable HTTP MCP endpoint:

`https://petercurry.org/api/pops/mcp`

1. In your agent app, add a custom MCP connector with this URL. Choose OAuth with automatic client registration (DCR). No API key or pre-created client secret is needed. In Claude, use Customize → Connectors → Add custom connector and choose **Register automatically** rather than Claude's published identity (CIMD).
2. Sign in with the existing POps owner password and review the connection's callback address and requested permissions. Select **Allow connection**. Enable POps in the conversation.
3. Try “Create a task in my Writing workspace to research my next essay”, or ask it to rename an existing task, update its description or tags, or record results. The returned task link opens the dashboard.

OAuth connections appear at `/pops/connect` after the token exchange. Revoke a connection there to disable both its access and refresh tokens. Access tokens last one hour; refresh tokens rotate on every use and the connection expires after 30 days, when you reconnect. Replaying a used refresh token revokes the connection. These lifetimes also apply when an agent app stays open.

The MCP tools are `pops_list_tasks`, `pops_get_task`, `pops_get_task_brief`, `pops_get_pipeline_prompt`, `pops_list_pipelines`, `pops_get_playbook`, `pops_create_task`, `pops_update_task`, `pops_record_agent_run`, `pops_create_decision`, `pops_relay_feedback`, and `pops_propose`. Agents can edit titles, descriptions, and tags when asked. The edit tool requires `expectedUpdatedAt` from a fresh `pops_get_task` response and rejects stale edits with a conflict. Omitted fields stay unchanged; tags replace the entire tag list. Each edit is recorded in history as an agent action and leaves human-engagement and resurfacing timestamps unchanged. Task completion and archiving remain owner actions.

Other connection options still work:

- **Bearer credentials** from `/pops/connect` for coding agents, scripts, and OpenAPI actions. Import `/api/pops/v1/openapi.json` into an agent's OpenAPI action and choose API key → Bearer.
- **Copy and paste:** generate a prompt and import the agent's `pops-report` block on the task page. Import is idempotent.

### OAuth deployment

Apply `20261107010000_pops_mcp_oauth` with `npx prisma migrate deploy` before running the new app version. It adds four OAuth tables and does not alter existing task data. Keep `POPS_BASE_URL` set to the public HTTPS origin clients will connect to (default `https://petercurry.org`). Discovery uses this configured origin, never a caller-controlled Host header. No new external service or signing secret is needed.

Discovery is public at `/.well-known/oauth-authorization-server`, `/.well-known/oauth-protected-resource`, and `/.well-known/oauth-protected-resource/api/pops/mcp`. Client registration, token exchange, and revocation live under `/api/pops/oauth/`. Registration creates a public client identity only; it grants no task access. The owner-authenticated consent action issues a short-lived, single-use code bound to the exact registered HTTPS callback, client, resource, scopes, and S256 PKCE challenge. Only token hashes are persisted. OAuth access tokens are accepted at the MCP endpoint; the REST API continues to use bearer credentials.

The implementation uses public clients with automatic registration (DCR). It does not advertise CIMD or client-secret authentication. Agent apps may ask you to confirm writes according to their own settings; the connector does not bypass those controls. Workspace administrators may restrict installing custom connectors.

Current setup references: [Claude custom connectors](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp), and [MCP authorization](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization).

### REST API

All routes require `Authorization: Bearer pops_…` and return JSON with `Cache-Control: no-store`.

| Method | Path | Scope |
| --- | --- | --- |
| GET | `/api/pops/v1/tasks?workspace=&status=&tag=` | `tasks:read` |
| POST | `/api/pops/v1/tasks` | `tasks:write` — `idempotencyKey` optional |
| PATCH | `/api/pops/v1/tasks/{id}` | `tasks:write` — title, description, tags; requires `expectedUpdatedAt` |
| GET | `/api/pops/v1/tasks/{id}` | `tasks:read` — full context for the next agent |
| GET | `/api/pops/v1/tasks/{id}/prompt` (optional `?pipeline=`) | `tasks:read` |
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
- **Agent credentials.** Created at `/pops/connect` or through explicit OAuth consent, scoped, revocable, with `lastUsedAt`. Bearer credentials are shown once; OAuth access and refresh tokens are stored only as SHA-256 hashes. A browser session cookie does not authorise the API. OAuth routes use database-backed per-IP rate limits; consent uses Next server actions with origin checks.
- **Agent writes are validated** with Zod (`lib/pops/validation.ts`): size limits, enumerations, `http(s)`/`obsidian` URLs only, Anki id format, 256 KB body cap.
- **Idempotency.** Runs are keyed by `idempotencyKey` (unique) plus a content hash; history entries carry unique `dedupeKey`s inserted with `ON CONFLICT DO NOTHING`. Concurrent replays are tested.
- **Completion is human-only.** The run schema has no status field; unknown fields are stripped. Agent activity never updates `lastHumanEngagementAt`.
- **Instruction integrity.** Foundational permission boundaries live in code (`FOUNDATIONAL_BOUNDARIES`), are shown read-only on the playbook page, and are placed *after* the playbook in every prompt. Agents can only create proposals; the playbook and pipelines change only when the owner saves a new version, and accepted proposals are linked from the version that applied them.
- **No public task data.** `/pops` and `/api/pops` are `noindex` and disallowed in robots. The OpenAPI schema and OAuth discovery/registration endpoints are public; none expose tasks or grant access without owner approval.
- **Links** from agents render with `rel="noopener noreferrer nofollow"`; `javascript:` and other schemes are rejected at validation and again at render.

## Anki and the Quiz Trainer

The `learn-textbook-anki` pipeline asks for cards in the Quiz Trainer inbox format (`{"version":1,"id","deck","front","back"}`, deck `Learning::1Injection::ButtressCards`), in the user's detailed style with a cited `Further reading:` section. Cards appear on the run with *Copy inbox JSON* buttons. An agent may write them to `peachymomotaro/Quiz-Trainer-App/chatgpt/anki-inbox/<id>.json` via a GitHub connector **only when you confirm in the conversation**; the existing add-on then imports them. POps does not build a flashcard app.

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

- **Single-owner OAuth with DCR.** Reuses the existing owner login and scoped agent permissions. Supports any MCP agent app without introducing an identity-provider account; adding multiple owners would need owner-bound grants.
- **Shared database, single owner, no user FK.** Matches "only the site owner"; adding an owner id later is a simple migration.
- **Pipeline name/summary/workspace are not versioned**, only instructions and expected evidence (what agents execute).
- **Lazy seeding** of templates rather than a data migration, so editing or archiving templates is never undone.
- **307 redirect from `/qb`**, not 308, so browsers do not cache it if the change is reversed.

## Known limitations

- OAuth supports automatic client registration (DCR), not published client identity documents (CIMD). Choose Register automatically in Claude. Connections must be reauthorized after 30 days.
- One owner session store with no "log out everywhere" button (revoke by deleting `PopsSession` rows).
- No full-text search across tasks; the Everything view filters by status and tag.
- Feedback informs ranking and is fed into prompts, but there is no automatic pipeline rewriting (by design).
- Copy buttons use the Clipboard API. If the browser blocks it, the button says so; the prompt page's text can still be selected by hand, but the decision copy text is not shown separately.

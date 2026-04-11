# Reading River Daily Email Design

**Goal:** Let each Reading River user opt in or out of a daily email containing that day's Reading River picks, sent around 08:00 London time in a layout that feels consistent with the site.

## Chosen approach

Use a per-user opt-in setting plus a shared scheduled delivery pipeline:

- store daily-email preferences on `AppSettings`
- add a simple `/reading-river/preferences` page with an opt-in toggle
- reuse the existing homepage recommendation logic so the email mirrors the app's two featured picks
- send mail through the existing Resend integration layer
- trigger delivery from a cron-backed route that is secured with `CRON_SECRET`

This keeps the product simple for readers, avoids adding a second recommendation system, and fits the current Reading River architecture.

## Architecture

### Settings model

Extend `AppSettings` with:

- `dailyDigestEnabled Boolean @default(false)`
- `lastDailyDigestSentAt DateTime?`

`dailyDigestEnabled` controls whether the user receives the email. `lastDailyDigestSentAt` prevents duplicate sends when the job is retried or invoked more than once on the same London-local day.

### Preferences UI

Add a `Preferences` page under `/reading-river/preferences` and link to it from the Reading River shell navigation. The first version only needs:

- one checkbox/toggle for opting in
- explanatory copy that the email arrives at `08:00 London time`
- a single save button

The page should use the existing editorial panels and typography so it feels native to the current product rather than like an admin screen.

### Digest composition

Build the email content from the same underlying selection pipeline as the homepage:

- `Next priority read`
- `From the stream`

The digest helper should reuse `buildHomePageData(...)` or a thin wrapper around it so the email and the web UI stay aligned. If both picks exist, send both. If only one exists, send one. If none exist, skip sending for that user.

For each item, the email should include:

- title
- source/site metadata when available
- estimated reading time when available
- tags when useful
- one primary link

If an item has a `sourceUrl`, the primary link should point there. If not, the fallback link should point back into Reading River.

### Email presentation

The email should be deliberately simple:

- editorial heading and short intro
- one or two article cards
- soft paper background and Reading River accent colors
- plain text alternative alongside the HTML body

It should echo the current site design without trying to reproduce every interactive control from the homepage.

## Scheduling

The desired send time is `08:00 Europe/London`, but Vercel cron schedules are UTC-based and Hobby precision is hourly. To handle GMT/BST cleanly without per-user scheduling:

- add two daily cron invocations, one at `07:00 UTC` and one at `08:00 UTC`
- point both invocations at the same public route
- in the route, convert `now` into `Europe/London`
- continue only when the London-local hour is `08`
- use `lastDailyDigestSentAt` to guarantee at most one send per user per London-local day

This means the email lands during the London 8 o'clock hour year-round, while remaining compatible with Vercel's UTC cron model.

## Operational flow

1. Vercel hits the cron route with `Authorization: Bearer <CRON_SECRET>`.
2. The route verifies the secret and checks whether the current London-local time is inside the 08:00 hour.
3. The route loads all users whose settings have `dailyDigestEnabled = true`.
4. For each opted-in user:
   - skip if a digest was already sent on the current London-local day
   - compute that user's current digest picks
   - skip if there are zero picks
   - send the email through Resend
   - update `lastDailyDigestSentAt` only after a successful send
5. The route returns a JSON summary with sent and skipped counts.

## Error handling

- Invalid or missing `CRON_SECRET` returns `401`.
- Missing Resend configuration or provider failures for one user should not abort the entire batch.
- Failed sends should be logged and should not update `lastDailyDigestSentAt`.
- Users with zero picks should be skipped quietly.
- Users who never visit Preferences remain opted out by default.

## Configuration

The feature depends on:

- `READING_RIVER_BASE_URL`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `CRON_SECRET`

It also introduces a repo-level `vercel.json` cron configuration for the two daily UTC triggers.

## Testing

Use TDD across four layers:

- schema/settings tests for the new `AppSettings` fields and defaults
- UI/action tests for the Preferences page and shell navigation
- digest/email tests for one-item and two-item rendering
- route tests for cron auth, London-time gating, duplicate-send prevention, and zero-pick skips

This keeps the risky parts covered: state defaults, user-facing controls, recommendation reuse, and scheduled delivery behavior.

# Reading River Daily Email Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a per-user daily Reading River email opt-in, send opted-in users their current Reading River picks around 08:00 London time, and keep the email visually aligned with the site.

**Architecture:** Extend `AppSettings` with digest opt-in and last-sent state, add a simple Preferences page inside Reading River, build digest content from the existing homepage recommendation pipeline, and trigger sending from a cron-protected route outside the authenticated `/reading-river/*` subtree. Use two UTC cron invocations plus a London-local hour gate to approximate `08:00 Europe/London` year-round on Vercel.

**Tech Stack:** Next.js App Router, Prisma/Postgres, Resend, Vitest, Testing Library, Vercel cron configuration.

---

### Task 1: Add daily-digest settings to Prisma and defaults

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/202604111600_daily_digest_settings/migration.sql`
- Modify: `lib/reading-river/settings.ts`
- Modify: `tests/schema/app-settings.test.ts`
- Modify: `tests/lib/reading-river-settings.test.ts`

**Step 1: Write the failing test**

Update the schema/settings tests so they expect the new digest fields:

```ts
import { Prisma } from "@prisma/client";

expect(Prisma.AppSettingsScalarFieldEnum.dailyDigestEnabled).toBe("dailyDigestEnabled");
expect(Prisma.AppSettingsScalarFieldEnum.lastDailyDigestSentAt).toBe("lastDailyDigestSentAt");

expect(getAppSettingsDefaults("user-2")).toMatchObject({
  userId: "user-2",
  dailyDigestEnabled: false,
  lastDailyDigestSentAt: null,
});
```

Also expand the existing mocked settings fixtures in `tests/lib/reading-river-settings.test.ts` to include the two new fields so the type expectations stay honest.

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/schema/app-settings.test.ts tests/lib/reading-river-settings.test.ts`
Expected: FAIL because Prisma and the settings defaults do not expose digest fields yet.

**Step 3: Write minimal implementation**

Add the fields to `AppSettings`, add a matching SQL migration, and extend the default settings helper:

```prisma
model AppSettings {
  id                    String   @id @default(cuid())
  userId                String   @unique
  displayMode           DisplayMode @default(suggested)
  manualOrderActive     Boolean  @default(false)
  highPriorityThreshold Int      @default(7)
  shortReadThresholdMinutes Int  @default(25)
  defaultReadingSpeedWpm Int     @default(200)
  dailyDigestEnabled    Boolean  @default(false)
  lastDailyDigestSentAt DateTime?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  user                  User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

```sql
ALTER TABLE "AppSettings"
ADD COLUMN "dailyDigestEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "lastDailyDigestSentAt" TIMESTAMP(3);
```

```ts
return {
  userId,
  displayMode: DisplayMode.suggested,
  manualOrderActive: false,
  highPriorityThreshold: 7,
  shortReadThresholdMinutes: 25,
  defaultReadingSpeedWpm: DEFAULT_READING_SPEED_WPM,
  dailyDigestEnabled: false,
  lastDailyDigestSentAt: null,
};
```

After editing the schema, regenerate the Prisma client with `npx prisma generate`.

**Step 4: Run test to verify it passes**

Run: `npx prisma generate`
Then run: `npm test -- tests/schema/app-settings.test.ts tests/lib/reading-river-settings.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/202604111600_daily_digest_settings/migration.sql lib/reading-river/settings.ts tests/schema/app-settings.test.ts tests/lib/reading-river-settings.test.ts
git commit -m "feat: add reading river daily digest settings"
```

### Task 2: Add the Preferences page and opt-in action

**Files:**
- Create: `app/reading-river/preferences/actions.ts`
- Create: `app/reading-river/preferences/page.tsx`
- Modify: `components/reading-river/shell-nav.tsx`
- Modify: `tests/app/reading-river-shell.test.tsx`
- Create: `tests/actions/reading-river-preferences-actions.test.ts`
- Create: `tests/ui/reading-river-preferences-page.test.tsx`

**Step 1: Write the failing test**

Add three focused tests:

```ts
expect(screen.getByRole("link", { name: "Preferences" })).toHaveAttribute(
  "href",
  "/reading-river/preferences",
);
```

```ts
expect(screen.getByRole("heading", { name: "Preferences" })).toBeInTheDocument();
expect(
  screen.getByLabelText("Receive a daily Reading River email at 08:00 London time."),
).not.toBeChecked();
```

```ts
await expect(updatePreferencesAction(formData)).rejects.toThrow(
  "redirect:/reading-river/preferences?saved=1",
);

expect(prisma.appSettings.update).toHaveBeenCalledWith({
  where: { userId: "user-1" },
  data: { dailyDigestEnabled: true },
});
```

The page test should mock `requireCurrentUser()` and `getOrCreateAppSettings()`. The action test should mock `requireCurrentUser()`, Prisma, `revalidatePath()`, and `redirect()`.

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/app/reading-river-shell.test.tsx tests/ui/reading-river-preferences-page.test.tsx tests/actions/reading-river-preferences-actions.test.ts`
Expected: FAIL because the Preferences page, action, and nav link do not exist yet.

**Step 3: Write minimal implementation**

Create a server action that updates `dailyDigestEnabled`, and a simple page that renders the toggle inside the editorial shell:

```ts
export async function updatePreferencesAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const enabled = String(formData.get("dailyDigestEnabled") ?? "") === "on";

  await getPrismaClient().appSettings.upsert({
    where: { userId: currentUser.id },
    update: { dailyDigestEnabled: enabled },
    create: {
      ...getAppSettingsDefaults(currentUser.id),
      dailyDigestEnabled: enabled,
    },
  });

  revalidatePath(readingRiverPath("/preferences"));
  redirect(readingRiverPath("/preferences?saved=1"));
}
```

```tsx
<form action={updatePreferencesAction} className="editorial-form">
  <label className="block space-y-2">
    <input
      defaultChecked={settings.dailyDigestEnabled}
      name="dailyDigestEnabled"
      type="checkbox"
    />
    <span>Receive a daily Reading River email at 08:00 London time.</span>
  </label>
  <button type="submit" className="intake-submit-button">Save preferences</button>
</form>
```

Add a `Preferences` link to `ShellNav`.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/app/reading-river-shell.test.tsx tests/ui/reading-river-preferences-page.test.tsx tests/actions/reading-river-preferences-actions.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add app/reading-river/preferences/actions.ts app/reading-river/preferences/page.tsx components/reading-river/shell-nav.tsx tests/app/reading-river-shell.test.tsx tests/actions/reading-river-preferences-actions.test.ts tests/ui/reading-river-preferences-page.test.tsx
git commit -m "feat: add reading river digest preferences"
```

### Task 3: Build digest selection helpers and render the email

**Files:**
- Create: `lib/reading-river/daily-digest.ts`
- Modify: `lib/reading-river/email.ts`
- Modify: `lib/reading-river/public-url.ts`
- Create: `tests/lib/reading-river-daily-digest.test.ts`
- Create: `tests/lib/reading-river-email.test.ts`

**Step 1: Write the failing test**

Lock the digest behavior with helper/rendering tests:

```ts
await expect(getDailyDigestItems({ userId: "user-1", now })).resolves.toEqual([
  expect.objectContaining({ id: "priority-1", title: "Priority read" }),
  expect.objectContaining({ id: "stream-1", title: "From the stream" }),
]);
```

```ts
expect(isLondonDailyDigestHour(new Date("2026-06-01T07:15:00Z"))).toBe(true);
expect(isLondonDailyDigestHour(new Date("2026-12-01T08:15:00Z"))).toBe(true);
expect(isLondonDailyDigestHour(new Date("2026-12-01T07:15:00Z"))).toBe(false);
```

```ts
const message = buildReadingRiverDailyDigestEmail({
  displayName: "River Reader",
  items: [{ id: "item-1", title: "One good article", sourceUrl: null, tags: [] }],
});

expect(message.subject).toBe("Your Reading River for today");
expect(message.html).toContain("One good article");
expect(message.html).toContain("Reading River");
expect(message.text).toContain("/reading-river");
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/reading-river-daily-digest.test.ts tests/lib/reading-river-email.test.ts`
Expected: FAIL because the digest helper and email renderer do not exist yet.

**Step 3: Write minimal implementation**

Add a digest helper that reuses homepage data and normalizes the output into one or two items:

```ts
export async function getDailyDigestItems({
  userId,
  now = new Date(),
}: {
  userId: string;
  now?: Date;
}) {
  const data = await getHomePageData({ userId, now });

  return [data.priorityRead, data.streamRead].filter(
    (item): item is NonNullable<typeof item> => Boolean(item),
  );
}

export function isLondonDailyDigestHour(now: Date) {
  const londonHour = new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    hour12: false,
    timeZone: "Europe/London",
  }).format(now);

  return londonHour === "08";
}
```

Extend `public-url.ts` with helpers for Reading River home and item URLs, then extend `email.ts` with a digest renderer/sender that creates both `html` and `text` output and falls back to a Reading River URL when `sourceUrl` is missing.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/reading-river-daily-digest.test.ts tests/lib/reading-river-email.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/reading-river/daily-digest.ts lib/reading-river/email.ts lib/reading-river/public-url.ts tests/lib/reading-river-daily-digest.test.ts tests/lib/reading-river-email.test.ts
git commit -m "feat: add reading river daily digest email builder"
```

### Task 4: Add the cron route and Vercel schedule

**Files:**
- Create: `app/api/reading-river/daily-digest/route.ts`
- Create: `tests/api/reading-river-daily-digest-route.test.ts`
- Create: `vercel.json`

**Step 1: Write the failing test**

Add route tests for auth, London-time gating, and one-send-per-day behavior:

```ts
const response = await GET(new Request("https://example.com/api/reading-river/daily-digest"));
expect(response.status).toBe(401);
```

```ts
vi.setSystemTime(new Date("2026-12-01T07:15:00Z"));
const response = await GET(authorizedRequest());
expect(await response.json()).toMatchObject({ skipped: true, reason: "outside-window" });
```

```ts
vi.setSystemTime(new Date("2026-06-01T07:15:00Z"));
sendReadingRiverDailyDigestEmailMock.mockResolvedValue({ id: "email-1" });

const response = await GET(authorizedRequest());

expect(sendReadingRiverDailyDigestEmailMock).toHaveBeenCalledTimes(1);
expect(updateMock).toHaveBeenCalledWith({
  where: { userId: "user-1" },
  data: { lastDailyDigestSentAt: expect.any(Date) },
});
expect(await response.json()).toMatchObject({ sent: 1, skipped: 0 });
```

Also add a test proving a user with `lastDailyDigestSentAt` on the same London-local day is skipped, and a test proving users with zero digest items are skipped.

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/api/reading-river-daily-digest-route.test.ts`
Expected: FAIL because the route and cron config do not exist yet.

**Step 3: Write minimal implementation**

Create a public route outside the authenticated Reading River subtree:

```ts
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  if (!isLondonDailyDigestHour(now)) {
    return NextResponse.json({ skipped: true, reason: "outside-window", sent: 0 });
  }

  const settings = await getPrismaClient().appSettings.findMany({
    where: { dailyDigestEnabled: true },
    include: { user: true },
  });

  // loop users, skip same-day sends, build items, send, update timestamp
}
```

Create `vercel.json` with two daily UTC triggers that both point to the same route:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    { "path": "/api/reading-river/daily-digest", "schedule": "0 7 * * *" },
    { "path": "/api/reading-river/daily-digest", "schedule": "0 8 * * *" }
  ]
}
```

Inside the route, compute the London-local day key before comparing `lastDailyDigestSentAt` so the duplicate-send guard follows London dates instead of raw UTC dates.

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/api/reading-river-daily-digest-route.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add app/api/reading-river/daily-digest/route.ts tests/api/reading-river-daily-digest-route.test.ts vercel.json
git commit -m "feat: schedule reading river daily digest emails"
```

### Task 5: Document env vars and run full verification

**Files:**
- Modify: `.env.example`
- Modify: `README.md`

**Step 1: Write the failing test**

No dedicated automated test. Verify by inspection and final command output.

**Step 2: Write minimal implementation**

Document:

- `CRON_SECRET`
- `READING_RIVER_BASE_URL`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

Also document that:

- the shared send time is `08:00 London time`
- `vercel.json` uses `07:00 UTC` and `08:00 UTC` triggers to cover BST/GMT
- local manual testing can hit `/api/reading-river/daily-digest` with `Authorization: Bearer <CRON_SECRET>`

**Step 3: Verify the docs and schema**

Run: `npx prisma validate`
Expected: `The schema at prisma/schema.prisma is valid`

Then inspect:

```bash
rg -n "CRON_SECRET|08:00 London|daily-digest|RESEND_FROM_EMAIL" .env.example README.md vercel.json
```

Expected: the docs and config all use the same variable names and schedule description.

**Step 4: Run the full test suite**

Run: `npm test`
Expected: PASS with the new route, helpers, and UI tests included.

**Step 5: Commit**

```bash
git add .env.example README.md
git commit -m "docs: document reading river daily digest setup"
```

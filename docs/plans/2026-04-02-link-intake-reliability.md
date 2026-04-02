# Link Intake Reliability Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Reading River link intake more reliable by normalizing pasted domains, distinguishing fetch failures from low-confidence extraction, and letting users proceed manually after an unfetchable URL.

**Architecture:** Keep the existing server-action-based intake flow, but extend the intake state machine with a fetch-failure confirmation path. Normalize user-entered URLs in the server action, add a fetch timeout helper, and update the client form to render a dedicated proceed-anyway branch while preserving the existing low-confidence retry flow.

**Tech Stack:** Next.js server actions, React `useActionState`, TypeScript, Vitest, Testing Library

---

### Task 1: Extend URL intake tests for normalization and fetch-failure flow

**Files:**
- Modify: `tests/actions/url-intake-action.test.ts`

**Step 1: Write the failing test**

Add tests that verify:

```ts
it("normalizes a URL without a scheme before fetching", async () => {
  const formData = new FormData();
  formData.set("url", "papers.ssrn.com/sol3/papers.cfm?abstract_id=2033231");

  await submitUrlIntake(initialIntakeFormState, formData);

  expect(fetch).toHaveBeenCalledWith(
    "https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2033231",
    expect.any(Object),
  );
});

it("returns a fetch-failed confirmation state when the page cannot be fetched", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connect failed")));

  const result = await submitUrlIntake(initialIntakeFormState, formData);

  expect(result).toEqual({
    status: "fetch_failed_confirm",
    message: expect.stringContaining("couldn't fetch this page"),
    draftValues: expect.any(Object),
    submittedAt: expect.any(Number),
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/actions/url-intake-action.test.ts`
Expected: FAIL because the current intake flow neither normalizes bare domains nor exposes a dedicated fetch-failure state.

**Step 3: Write minimal implementation**

Do not implement yet. Only confirm the failure first.

**Step 4: Run test to verify it still fails for the right reason**

Run: `npx vitest run tests/actions/url-intake-action.test.ts`
Expected: FAIL with assertion mismatches on URL normalization and returned state.

**Step 5: Commit**

```bash
git add tests/actions/url-intake-action.test.ts
git commit -m "test: cover link intake fetch failure flow"
```

### Task 2: Implement server-side URL normalization and fetch-failure flow

**Files:**
- Modify: `app/reading-river/actions/ingest-url.ts`
- Modify: `lib/reading-river/intake-form-state.ts`

**Step 1: Write the failing test**

Use the tests from Task 1 plus additional coverage for:

```ts
it("requires manual estimated minutes after proceed-anyway on a fetch failure", async () => {
  const result = await submitUrlIntake(
    {
      status: "fetch_failed_confirm",
      message: "retry",
      draftValues: {
        url: "https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2033231",
        title: "",
        notes: "",
        priorityScore: "5",
        estimatedMinutes: "",
        tagNames: "",
      },
      submittedAt: 1,
    },
    formData,
  );

  expect(result.status).toBe("needs_estimate");
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/actions/url-intake-action.test.ts`
Expected: FAIL because the current action only supports `idle`, `success`, `error`, and `needs_estimate`.

**Step 3: Write minimal implementation**

Implement:

- a server-side URL normalization helper that prefixes `https://` for host-style inputs
- a validation helper that rejects still-invalid URLs with a specific user-facing error
- a fetch timeout wrapper around the outgoing page request
- a new `fetch_failed_confirm` intake state in `IntakeFormState`
- branch logic so:
  - fetch failure returns `fetch_failed_confirm`
  - proceed-anyway without estimated minutes returns `needs_estimate`
  - proceed-anyway with estimated minutes saves using manual estimation metadata

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/actions/url-intake-action.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add app/reading-river/actions/ingest-url.ts lib/reading-river/intake-form-state.ts tests/actions/url-intake-action.test.ts
git commit -m "fix: harden reading river link intake flow"
```

### Task 3: Update the form UI for relaxed input and proceed-anyway handling

**Files:**
- Modify: `components/reading-river/url-intake-form.tsx`
- Modify: `tests/ui/add-item-flows.test.tsx`

**Step 1: Write the failing test**

Add assertions that:

- the URL field is no longer `type="url"`
- fetch-failure state shows the new warning copy
- fetch-failure state renders a `Proceed anyway` submit control
- estimated minutes is shown when the action returns `needs_estimate`

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ui/add-item-flows.test.tsx`
Expected: FAIL because the current form only renders the generic state block and strict URL input.

**Step 3: Write minimal implementation**

Update the form to:

- use a relaxed text input for pasted links
- preserve draft values from server state
- render fetch-failure confirmation UI with a `Proceed anyway` submit button
- keep the existing success and low-confidence estimate flows intact

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ui/add-item-flows.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add components/reading-river/url-intake-form.tsx tests/ui/add-item-flows.test.tsx
git commit -m "feat: add proceed-anyway state to link form"
```

### Task 4: Run verification

**Files:**
- No source changes required unless verification reveals a defect

**Step 1: Run focused verification**

Run: `npx vitest run tests/actions/url-intake-action.test.ts tests/ui/add-item-flows.test.tsx`
Expected: PASS

**Step 2: Run full verification**

Run: `npm test -- --exclude '.worktrees/**'`
Expected: PASS

**Step 3: Record any remaining caveats**

- If a site blocks automated access, the action should now show the fetch-failure confirmation state rather than a generic error.
- If a user proceeds manually, estimated minutes remain required before save.

**Step 4: Commit**

```bash
git add .
git commit -m "test: verify link intake reliability"
```

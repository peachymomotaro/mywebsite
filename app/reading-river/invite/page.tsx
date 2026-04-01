import { goToInviteRedemptionAction } from "./actions";

type InviteEntryPageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

function getErrorMessage(error: string | null) {
  switch (error) {
    case "invalid_input":
      return "Paste the invite link or invite token you received.";
    default:
      return null;
  }
}

export default async function InviteEntryPage({ searchParams }: InviteEntryPageProps = {}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const error =
    typeof resolvedSearchParams.error === "string" ? resolvedSearchParams.error : null;
  const errorMessage = getErrorMessage(error);

  return (
    <main className="min-h-screen bg-background px-6 py-16 text-foreground">
      <div className="mx-auto flex min-h-screen max-w-md items-center">
        <section className="w-full rounded-3xl border border-border bg-card/80 p-8 shadow-sm backdrop-blur">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.24em] text-mutedForeground">
              Reading River
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">Redeem your invite</h1>
            <p className="text-sm leading-6 text-mutedForeground">
              Paste the invite link or token you received, then continue to account setup.
            </p>
          </div>

          {errorMessage ? (
            <p
              aria-live="polite"
              role="alert"
              className="mt-6 rounded-2xl border border-border bg-white/80 px-4 py-3 text-sm text-foreground"
            >
              {errorMessage}
            </p>
          ) : null}

          <form action={goToInviteRedemptionAction} className="mt-8 space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium">Invite link or token</span>
              <input
                className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-base"
                name="invite"
                required
                type="text"
              />
            </label>
            <button
              className="inline-flex w-full items-center justify-center rounded-2xl bg-foreground px-4 py-3 text-sm font-medium text-background"
              type="submit"
            >
              Continue
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

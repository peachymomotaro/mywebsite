import { redeemInviteAction } from "./actions";
import { getInviteRedemptionState } from "@/lib/reading-river/invites";

type InviteRedemptionPageProps = {
  params:
    | Promise<{
        token: string;
      }>
    | {
        token: string;
      };
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

function getStatusMessage(status: string) {
  switch (status) {
    case "invalid_input":
      return "Please enter a password before creating your account.";
    case "expired":
      return "This invite has expired.";
    case "revoked":
      return "This invite is no longer valid.";
    case "redeemed":
      return "This invite has already been used.";
    case "account_exists":
      return "An account already exists for this invite email. Log in instead.";
    default:
      return "This invite link is not valid.";
  }
}

export default async function InviteRedemptionPage({
  params,
  searchParams,
}: InviteRedemptionPageProps) {
  const { token } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const error =
    typeof resolvedSearchParams.error === "string" ? resolvedSearchParams.error : null;
  const redemptionState = await getInviteRedemptionState(token);

  if (redemptionState.status !== "valid") {
    return (
      <main className="min-h-screen bg-background px-6 py-16 text-foreground">
        <div className="mx-auto flex min-h-screen max-w-md items-center">
          <section className="w-full rounded-3xl border border-border bg-card/80 p-8 shadow-sm backdrop-blur">
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.24em] text-mutedForeground">
                Reading River
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">Invite unavailable</h1>
              <p className="text-sm leading-6 text-mutedForeground">
                {getStatusMessage(redemptionState.status)}
              </p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-6 py-16 text-foreground">
      <div className="mx-auto flex min-h-screen max-w-md items-center">
        <section className="w-full rounded-3xl border border-border bg-card/80 p-8 shadow-sm backdrop-blur">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.24em] text-mutedForeground">
              Reading River
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">Accept your invite</h1>
            <p className="text-sm leading-6 text-mutedForeground">
              Set a password to activate your private Reading River.
            </p>
          </div>

          {error ? (
            <p className="mt-6 rounded-2xl border border-border bg-white/80 px-4 py-3 text-sm text-foreground">
              {getStatusMessage(error)}
            </p>
          ) : null}

          <form action={redeemInviteAction} className="mt-8 space-y-4">
            <input name="token" type="hidden" value={token} />
            <label className="block space-y-2">
              <span className="text-sm font-medium">Email</span>
              <input
                className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-base"
                defaultValue={redemptionState.invite.email}
                disabled
                type="email"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Display name</span>
              <input
                className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-base"
                name="displayName"
                type="text"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Password</span>
              <input
                autoComplete="new-password"
                className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-base"
                name="password"
                required
                type="password"
              />
            </label>
            <button
              className="inline-flex w-full items-center justify-center rounded-2xl bg-foreground px-4 py-3 text-sm font-medium text-background"
              type="submit"
            >
              Create account
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

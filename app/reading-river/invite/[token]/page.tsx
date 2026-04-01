import { AuthActions } from "@/components/reading-river/auth-actions";
import { AuthField } from "@/components/reading-river/auth-field";
import { AuthShell } from "@/components/reading-river/auth-shell";
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
      <AuthShell
        frameClassName="max-w-md"
        title="Invite unavailable"
        description={
          <p className="auth-description">{getStatusMessage(redemptionState.status)}</p>
        }
      />
    );
  }

  return (
    <AuthShell
      frameClassName="max-w-md"
      title="Accept your invite"
      description={
        <p className="auth-description">Set a password to activate your private Reading River.</p>
      }
      feedback={
        error ? (
          <p aria-live="polite" role="alert" className="auth-feedback-copy">
            {getStatusMessage(error)}
          </p>
        ) : null
      }
    >
      <form action={redeemInviteAction} className="editorial-form auth-form">
        <input name="token" type="hidden" value={token} />
        <AuthField label="Email">
          <input
            className="intake-input auth-input"
            defaultValue={redemptionState.invite.email}
            disabled
            type="email"
          />
        </AuthField>
        <AuthField label="Display name">
          <input className="intake-input auth-input" name="displayName" type="text" />
        </AuthField>
        <AuthField label="Password">
          <input
            autoComplete="new-password"
            className="intake-input auth-input"
            name="password"
            required
            type="password"
          />
        </AuthField>
        <AuthActions>
          <button className="river-primary-action auth-action-full" type="submit">
            Create account
          </button>
        </AuthActions>
      </form>
    </AuthShell>
  );
}

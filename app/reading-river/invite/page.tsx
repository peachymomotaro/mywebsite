import { AuthActions } from "@/components/reading-river/auth-actions";
import { AuthField } from "@/components/reading-river/auth-field";
import { AuthShell } from "@/components/reading-river/auth-shell";
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
    <AuthShell
      frameClassName="max-w-md"
      title="Redeem your invite"
      description={
        <p className="auth-description">
          Paste the invite link or token you received, then continue to account setup.
        </p>
      }
      feedback={
        errorMessage ? (
          <p aria-live="polite" role="alert" className="auth-feedback-copy">
            {errorMessage}
          </p>
        ) : null
      }
    >
      <form action={goToInviteRedemptionAction} className="editorial-form auth-form">
        <AuthField label="Invite link or token">
          <input className="intake-input auth-input" name="invite" required type="text" />
        </AuthField>
        <AuthActions>
          <button className="river-primary-action auth-action-full" type="submit">
            Continue
          </button>
        </AuthActions>
      </form>
    </AuthShell>
  );
}

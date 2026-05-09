import { AuthActions } from "@/components/reading-river/auth-actions";
import { AuthField } from "@/components/reading-river/auth-field";
import { AuthShell } from "@/components/reading-river/auth-shell";
import { getPasswordResetState } from "@/lib/reading-river/password-resets";
import { resetPasswordAction } from "./actions";

type ResetPasswordPageProps = {
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
      return "Please enter a new password.";
    case "expired":
      return "This password reset link has expired.";
    case "used":
      return "This password reset link has already been used.";
    default:
      return "This password reset link is not valid.";
  }
}

export default async function ResetPasswordPage({
  params,
  searchParams,
}: ResetPasswordPageProps) {
  const { token } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const error =
    typeof resolvedSearchParams.error === "string" ? resolvedSearchParams.error : null;
  const resetState = await getPasswordResetState(token);

  if (resetState.status !== "valid") {
    return (
      <AuthShell
        frameClassName="max-w-md"
        title="Reset link unavailable"
        description={<p className="auth-description">{getStatusMessage(resetState.status)}</p>}
      />
    );
  }

  return (
    <AuthShell
      frameClassName="max-w-md"
      title="Set a new password"
      description={<p className="auth-description">Choose a new Reading River password.</p>}
      feedback={
        error ? (
          <p aria-live="polite" role="alert" className="auth-feedback-copy">
            {getStatusMessage(error)}
          </p>
        ) : null
      }
    >
      <form action={resetPasswordAction} className="editorial-form auth-form">
        <input name="token" type="hidden" value={token} />
        <AuthField label="Email">
          <input
            className="intake-input auth-input"
            defaultValue={resetState.resetToken.user.email}
            disabled
            type="email"
          />
        </AuthField>
        <AuthField label="New password">
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
            Reset password
          </button>
        </AuthActions>
      </form>
    </AuthShell>
  );
}

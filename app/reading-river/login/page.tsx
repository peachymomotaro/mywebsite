import { AuthActions } from "@/components/reading-river/auth-actions";
import { AuthField } from "@/components/reading-river/auth-field";
import { AuthShell } from "@/components/reading-river/auth-shell";
import { measureReadingRiverTiming } from "@/lib/reading-river/timing";
import { loginAction } from "./actions";

type LoginPageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

function getErrorMessage(error: string | null) {
  switch (error) {
    case "invalid_credentials":
      return "The email or password you entered was not recognized.";
    case "account_disabled":
      return "This account has been disabled.";
    default:
      return null;
  }
}

export default async function LoginPage({ searchParams }: LoginPageProps = {}) {
  return measureReadingRiverTiming("page.reading-river-login.render", async () => {
    const resolvedSearchParams = (await searchParams) ?? {};
    const error =
      typeof resolvedSearchParams.error === "string" ? resolvedSearchParams.error : null;
    const errorMessage = getErrorMessage(error);

    return (
      <AuthShell
        frameClassName="max-w-md"
        title="Enter the stream"
        description={
          <p className="auth-description">Use your invite email and password to continue.</p>
        }
        feedback={
          errorMessage ? (
            <p aria-live="polite" role="alert" className="auth-feedback-copy">
              {errorMessage}
            </p>
          ) : null
        }
      >
        <form action={loginAction} className="editorial-form auth-form">
          <AuthField label="Email address">
            <input
              autoComplete="email"
              className="intake-input auth-input"
              name="email"
              required
              type="email"
            />
          </AuthField>
          <AuthField label="Password">
            <input
              autoComplete="current-password"
              className="intake-input auth-input"
              name="password"
              required
              type="password"
            />
          </AuthField>
          <AuthActions>
            <button className="river-primary-action auth-action-full" type="submit">
              Sign in
            </button>
          </AuthActions>
        </form>
      </AuthShell>
    );
  });
}

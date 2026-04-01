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
            <h1 className="text-3xl font-semibold tracking-tight">Enter the stream</h1>
            <p className="text-sm leading-6 text-mutedForeground">
              Use your invite email and password to continue.
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

          <form action={loginAction} className="mt-8 space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium">Email address</span>
              <input
                autoComplete="email"
                className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-base"
                name="email"
                required
                type="email"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Password</span>
              <input
                autoComplete="current-password"
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
              Sign in
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

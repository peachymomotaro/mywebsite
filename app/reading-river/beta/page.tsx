import { AuthActions } from "@/components/reading-river/auth-actions";
import { readingRiverPath } from "@/lib/reading-river/routes";

export default function BetaPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-16 text-foreground">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center">
        <section className="w-full rounded-3xl border border-border bg-card/80 p-8 shadow-sm backdrop-blur sm:p-10">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.24em] text-mutedForeground">
              Closed beta
            </p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Reading River beta
            </h1>
            <p className="max-w-2xl text-base leading-7 text-mutedForeground">
              A quieter way to choose the next worthwhile thing to read.
            </p>
            <p className="max-w-2xl text-sm leading-6 text-mutedForeground">
              Keep a private reading stream, pick the best next read, and return when you
              have time. Invited readers can sign in or redeem their invite here.
            </p>
          </div>

          <AuthActions className="mt-8 sm:flex-row">
            <a
              href={readingRiverPath("/login")}
              className="river-primary-action"
            >
              Log in
            </a>
            <a
              href={readingRiverPath("/invite")}
              className="river-primary-action river-primary-action-muted"
            >
              Redeem invite
            </a>
          </AuthActions>
        </section>
      </div>
    </main>
  );
}

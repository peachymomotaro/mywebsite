import { updatePreferencesAction } from "./actions";
import { requireCurrentUser } from "@/lib/reading-river/current-user";
import { getOrCreateAppSettings } from "@/lib/reading-river/settings";

type PreferencesPageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

function getSearchParamValue(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];

  return typeof value === "string" ? value : null;
}

export default async function PreferencesPage({ searchParams }: PreferencesPageProps = {}) {
  const currentUser = await requireCurrentUser();
  const settings = await getOrCreateAppSettings(currentUser.id);
  const resolvedSearchParams = (await searchParams) ?? {};
  const saved = getSearchParamValue(resolvedSearchParams, "saved") === "1";

  return (
    <main className="river-page">
      <section className="editorial-page-masthead">
        <div className="editorial-page-masthead-copy">
          <p className="editorial-page-kicker">Preferences</p>
          <h1 className="editorial-page-title">Preferences</h1>
          <p className="editorial-page-intro">
            Choose whether Reading River should send a daily digest email.
          </p>
        </div>
      </section>

      {saved ? (
        <section className="editorial-panel">
          <p className="river-history-meta">Preferences saved.</p>
        </section>
      ) : null}

      <section className="editorial-panel">
        <form action={updatePreferencesAction} className="editorial-form">
          <label className="block space-y-2">
            <input
              defaultChecked={settings.dailyDigestEnabled}
              name="dailyDigestEnabled"
              type="checkbox"
            />
            <span>Receive a daily Reading River email at 08:00 London time.</span>
          </label>
          <button type="submit" className="intake-submit-button">
            Save preferences
          </button>
        </form>
      </section>
    </main>
  );
}

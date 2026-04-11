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

      <section className="editorial-panel river-preferences-panel">
        <form action={updatePreferencesAction} className="editorial-form river-preferences-form">
          <label className="river-preferences-choice">
            <input
              className="river-preferences-checkbox"
              defaultChecked={settings.dailyDigestEnabled}
              name="dailyDigestEnabled"
              type="checkbox"
            />
            <span className="river-preferences-choice-copy">
              Receive a daily email with two picks from your River.
            </span>
          </label>
          <div className="intake-submit-row river-preferences-submit-row">
            <button type="submit" className="intake-submit-button">
              Save preferences
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

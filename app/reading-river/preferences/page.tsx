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
            Choose how often Reading River should send your reminder email.
          </p>
        </div>
      </section>

      <section className="editorial-panel river-preferences-panel">
        <form action={updatePreferencesAction} className="editorial-form river-preferences-form">
          <label className="river-preferences-choice">
            <span className="river-preferences-choice-copy">Email cadence</span>
            <select
              className="intake-input"
              defaultValue={settings.digestCadence}
              name="digestCadence"
            >
              <option value="off">Off</option>
              <option value="daily">Daily</option>
              <option value="every_other_day">Every other day</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="seasonal">Seasonal (every three months)</option>
            </select>
          </label>
          <p className="river-preferences-description">
            Reading River emails you with your picks for that day around 08:00 London time.
          </p>
          <label className="river-preferences-choice">
            <span className="river-preferences-choice-copy">Priority rotation</span>
            <input
              className="intake-input"
              defaultValue={settings.priorityRandomPoolSize}
              max={20}
              min={1}
              name="priorityRandomPoolSize"
              type="number"
            />
          </label>
          <p className="river-preferences-description">
            Choose how many of your highest priority reads the daily recommendation will rotate between.
            It's recommended to set this to at least three - focused on your priority picks, but it won't just show you the same thing day after day.
          </p>
          <label className="river-preferences-checkbox-row">
            <input
              className="river-preferences-checkbox"
              defaultChecked={settings.includeBookRouletteInDigest}
              name="includeBookRouletteInDigest"
              type="checkbox"
            />
            <span>Include Book Roulette in reminder emails</span>
          </label>
          <div className="intake-submit-row river-preferences-submit-row">
            <button type="submit" className="intake-submit-button">
              Save preferences
            </button>
          </div>
          {saved ? (
            <p className="river-preferences-feedback" role="status">
              Preferences saved.
            </p>
          ) : null}
        </form>
      </section>
    </main>
  );
}

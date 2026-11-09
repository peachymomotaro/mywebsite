import { updatePreferencesAction } from "./actions";
import { requireCurrentUser } from "@/lib/reading-river/current-user";
import { getOrCreateAppSettings } from "@/lib/reading-river/settings";

const cadenceOptions = [
  { value: "off", label: "Off" },
  { value: "daily", label: "Daily" },
  { value: "every_other_day", label: "Every other day" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "seasonal", label: "Seasonal (every three months)" },
] as const;

type PreferencesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSearchParamValue(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];

  return typeof value === "string" ? value : null;
}

/** Laid out like How It Works: each setting is a section with its name in the margin. */
export default async function PreferencesPage({ searchParams }: PreferencesPageProps) {
  const currentUser = await requireCurrentUser();
  const settings = await getOrCreateAppSettings(currentUser.id);
  const resolvedSearchParams = (await searchParams) ?? {};
  const saved = getSearchParamValue(resolvedSearchParams, "saved") === "1";

  return (
    <main className="editorial-page river-how-page">
      <div className="editorial-page-surface">
        <header className="editorial-page-masthead">
          <div className="editorial-page-masthead-copy">
            <h1 className="editorial-page-title">Preferences</h1>
            <p className="editorial-page-intro">
              Choose how often Reading River should send your reminder email.
            </p>
          </div>
        </header>

        <div className="editorial-page-content river-how-page-content">
          <section className="river-how-section" aria-labelledby="river-preferences-email">
            <h2 id="river-preferences-email">Reminder email</h2>
            <div className="river-how-copy">
              <form action={updatePreferencesAction} className="river-preferences-form">
                {/* A plain list of choices in the site's type, rather than the system's dropdown. */}
                <fieldset className="river-preferences-choice">
                  <legend className="river-preferences-choice-copy">Email cadence</legend>
                  <div className="river-preferences-options">
                    {cadenceOptions.map((option) => (
                      <label key={option.value} className="river-preferences-option">
                        <input
                          type="radio"
                          name="digestCadence"
                          value={option.value}
                          defaultChecked={settings.digestCadence === option.value}
                          className="river-preferences-radio"
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <p className="river-preferences-description">
                  Reading River emails you with your picks for that day around 08:00 London time.
                </p>
                <div className="river-preferences-submit-row">
                  <button type="submit" className="intake-submit-button">
                    Save preferences
                  </button>
                  {saved ? (
                    <p className="river-preferences-feedback" role="status">
                      Preferences saved.
                    </p>
                  ) : null}
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

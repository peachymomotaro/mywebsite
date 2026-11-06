/** The state of the small "Add" dropdown on the glade. */
export type QuickAddState =
  | { status: "idle" }
  /** Saved: the piece will drift by in its own time. */
  | { status: "saved"; title: string; minutes: number; submittedAt: number }
  /**
   * The page didn't say how long it is (or couldn't be read), so we ask for
   * the minutes and save it on the next submit.
   */
  | { status: "needsMinutes"; url: string; title: string | null; message: string; submittedAt: number }
  | { status: "error"; url: string; message: string; submittedAt: number };

export const QUICK_ADD_IDLE: QuickAddState = { status: "idle" };

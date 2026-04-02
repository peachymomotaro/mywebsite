export type UrlIntakeDraftValues = {
  url: string;
  title: string;
  notes: string;
  priorityScore: string;
  estimatedMinutes: string;
  tagNames: string;
};

export type IntakeFormState = {
  status: "idle" | "success" | "error" | "needs_estimate" | "fetch_failed_confirm";
  message?: string;
  savedTitle?: string;
  draftValues?: UrlIntakeDraftValues;
  submittedAt?: number;
};

export const initialIntakeFormState: IntakeFormState = {
  status: "idle",
};

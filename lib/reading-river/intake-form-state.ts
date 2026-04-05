import type {
  LengthEstimationConfidence,
  LengthEstimationMethod,
} from "@/lib/reading-river/article-length-estimation";

export type UrlIntakeDraftValues = {
  url: string;
  title: string;
  notes: string;
  priorityScore: string;
  estimatedMinutes: string;
  tagNames: string;
};

export type UrlIntakeReviewMetadata = {
  fetchSucceeded: boolean;
  estimatedMinutesRequired: boolean;
  extractedTitle: string | null;
  extractedText: string | null;
  titleWasPrefilled: boolean;
  siteName: string | null;
  author: string | null;
  wordCount: number | null;
  estimatedMinutes: number | null;
  lengthEstimationMethod: LengthEstimationMethod;
  lengthEstimationConfidence: LengthEstimationConfidence;
};

export type IntakeFormState = {
  status: "idle" | "success" | "error" | "review";
  message?: string;
  savedTitle?: string;
  draftValues?: UrlIntakeDraftValues;
  reviewMetadata?: UrlIntakeReviewMetadata;
  submittedAt?: number;
};

export const initialIntakeFormState: IntakeFormState = {
  status: "idle",
};

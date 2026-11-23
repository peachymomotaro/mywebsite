import type { Comparison } from "./results";

export const conflictExperiment = {
  id: "stepping-in",
  title: "Stepping In",
  teaser: "Think back to a conflict between friends. What did stepping in have to offer?",
  category: "Social experiment",
  original: { name: "Halevy & Halali (2015), Study 1", url: "https://doi.org/10.1073/pnas.1505067112" },
} as const;

export const conflictStatements = [
  { id: "benefit", label: "Stepping into the conflict benefited me." },
  { id: "status", label: "Stepping into the conflict would have raised my standing in other people’s eyes." },
  { id: "relationships", label: "Stepping into the conflict would have improved my relationships with other people." },
] as const;

// The OSF scoring script reverses the instrument's order, so 7 is strongest agreement.
export const agreementOptions = [
  { value: 7, label: "Strongly agree" },
  { value: 6, label: "Agree" },
  { value: 5, label: "Somewhat agree" },
  { value: 4, label: "Neither agree nor disagree" },
  { value: 3, label: "Somewhat disagree" },
  { value: 2, label: "Disagree" },
  { value: 1, label: "Strongly disagree" },
] as const;

export type ConflictCondition = {
  id: "intervened" | "stayed-out";
  label: string;
  recall: string;
  comparison: Comparison;
};

// OSF analysis/out/camerer_study_level.json → study 17, Wave 1 and Opus 5.5 composite.
// Each reported mean is the average of participants' three-item scores.
export const conflictConditions: readonly ConflictCondition[] = [
  {
    id: "intervened",
    label: "Recalled stepping in",
    recall: "Think of a time you saw a conflict between two friends and deliberately stepped in.",
    comparison: {
      human: { value: 3.831102613129382, n: 523 },
      ai: { value: 5.130656469088592, n: 523 },
    },
  },
  {
    id: "stayed-out",
    label: "Recalled staying out",
    recall: "Think of a time you saw a conflict between two friends and deliberately stayed out.",
    comparison: {
      human: { value: 2.6509136735979837, n: 529 },
      ai: { value: 2.5696282293635795, n: 529 },
    },
  },
];

export function assignConflictCondition(random = Math.random): ConflictCondition {
  return conflictConditions[random() < 0.5 ? 0 : 1];
}

export function conflictScore(ratings: readonly number[]): number | null {
  if (ratings.length !== conflictStatements.length) return null;
  if (ratings.some((value) => !Number.isInteger(value) || value < 1 || value > 7)) return null;
  return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
}

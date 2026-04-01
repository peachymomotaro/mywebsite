import { twMerge } from "tailwind-merge";

type ClassDictionary = Record<string, boolean | null | undefined>;
type ClassValue =
  | string
  | number
  | null
  | undefined
  | false
  | ClassDictionary
  | ClassValue[];

function flattenClassValue(input: ClassValue): string[] {
  if (!input) {
    return [];
  }

  if (typeof input === "string" || typeof input === "number") {
    return [String(input)];
  }

  if (Array.isArray(input)) {
    return input.flatMap((value) => flattenClassValue(value));
  }

  return Object.entries(input)
    .filter(([, enabled]) => Boolean(enabled))
    .map(([className]) => className);
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(inputs.flatMap((input) => flattenClassValue(input)).join(" "));
}

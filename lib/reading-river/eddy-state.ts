/** The eddies are a small pool beside the river: five pieces at most. */
export const EDDY_CAPACITY = 5;
export const EDDIES_FULL_MESSAGE = "The eddies hold five. Add another and the one that has been there longest drifts back into the river.";
export const clearedEddyMembership = { eddySlot: null, eddyAddedAt: null };

export type EddyActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

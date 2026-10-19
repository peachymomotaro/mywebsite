export const EDDY_CAPACITY = 10;
export const EDDIES_FULL_MESSAGE = "The eddies are full. Remove an article to make room.";
export const clearedEddyMembership = { eddySlot: null, eddyAddedAt: null };

export type EddyActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

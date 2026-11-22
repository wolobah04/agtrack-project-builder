import type { AppwriteActor } from "./appwrite-access";
import type { Role } from "./types";

export const DEFAULT_FARMER_VERIFIED = false;

/** Verification is Ministry approval, independent of account activation and farm quality score. */
export function farmerVerificationPatch(actor: AppwriteActor, targetRole: Role, verified: boolean) {
  if (!actor.active || actor.role !== "admin") throw new Error("Ministry admin access required");
  if (targetRole !== "farmer") throw new Error("Only farmer accounts can be verified");
  return { verified };
}
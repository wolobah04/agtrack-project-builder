import type { AppwriteActor } from "./appwrite-access";
import type { Role } from "./types";

export const DEFAULT_ACCOUNT_VERIFIED = false;

/** Ministry approval is independent of account activation and farm quality score. */
export function accountVerificationPatch(actor: AppwriteActor, targetRole: Role, verified: boolean) {
  if (!actor.active || actor.role !== "admin") throw new Error("Ministry admin access required");
  if (targetRole !== "farmer" && targetRole !== "agent") throw new Error("Only farmer and agent accounts can be verified");
  return { verified };
}

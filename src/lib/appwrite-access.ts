import type { Role } from "./types";

export interface AppwriteActor {
  id: string;
  role: Role;
  active: boolean;
}

/** Farmers can access their own records; agents only farmers assigned to them; active Ministry admins can access all. */
export function canAccessFarmer(actor: AppwriteActor, farmerId: string, assignedFarmerIds: string[] = []): boolean {
  if (!actor.active) return false;
  if (actor.role === "admin") return true;
  if (actor.role === "farmer") return actor.id === farmerId;
  return assignedFarmerIds.includes(farmerId);
}

export function canManageUsers(actor: AppwriteActor): boolean {
  return actor.active && actor.role === "admin";
}

export function canRegisterForAgent(actor: AppwriteActor, agentId: string): boolean {
  return actor.active && (actor.role === "admin" || (actor.role === "agent" && actor.id === agentId));
}

export function canReadAudit(actor: AppwriteActor): boolean {
  return canManageUsers(actor);
}

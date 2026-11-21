import { redirect } from "@tanstack/react-router";
import { getSession, homeFor } from "./auth";
import type { Role } from "./types";
export function requireRole(role: Role) {
  const s = getSession();
  if (!s) throw redirect({ to: "/login" });
  if (s.user.role !== role) throw redirect({ to: homeFor(s.user.role) });
  return { session: s };
}

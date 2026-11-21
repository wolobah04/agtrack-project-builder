import type { Role, User } from "./types";
const KEY = "agtrack-session";
export interface Session { token: string; user: User; expires_at: number }

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "null") as Session | null;
    if (!s || s.expires_at < Date.now()) { localStorage.removeItem(KEY); return null; }
    return s;
  } catch { return null; }
}
export function setSession(s: Session) { localStorage.setItem(KEY, JSON.stringify(s)); window.dispatchEvent(new Event("agtrack-auth")); }
export function updateSessionUser(user: User) { const s = getSession(); if (s) setSession({ ...s, user }); }
export function clearSession() { localStorage.removeItem(KEY); window.dispatchEvent(new Event("agtrack-auth")); }
export const homeFor = (r: Role) => (r === "admin" ? "/admin" : r === "agent" ? "/agent" : "/farmer");

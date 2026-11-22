/**
 * Typed AgTrack API client. Appwrite is preferred when configured.
 * Set VITE_USE_MOCK=true for browser-only demo data, or remove the Appwrite
 * project ID and set VITE_API_BASE_URL to use the legacy REST backend.
 */
import { clearSession, getSession } from "./auth";
import { appwriteApi, USE_APPWRITE } from "./appwrite";
import { approvedBatchActivities, type CropCalendarApi } from "./crop-calendar";
import { mockCropCalendar } from "./crop-calendar-mock";
import { DEFAULT_FARMER_VERIFIED, farmerVerificationPatch } from "./farmer-verification";
import { batchCode, db, save, uid, type MockDB } from "./mock-db";
import type { AuditLog, Expense, FarmReport, Harvest, InventoryTx, LossRecord, Role, Trace, User } from "./types";

const BASE = (import.meta.env["VITE_API_BASE_URL"] as string | undefined)?.replace(/\/$/, "");
export const USE_MOCK = !USE_APPWRITE && (!BASE || import.meta.env["VITE_USE_MOCK"] === "true");
const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms));

export class ApiError extends Error { constructor(message: string, public status = 400) { super(message); } }

async function http<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getSession()?.token;
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && typeof init.body === "string") headers.set("Content-Type", "application/json");
  const res = await fetch(`${BASE}/api/v1${path}`, { ...init, headers });
  if (res.status === 401) { clearSession(); if (typeof window !== "undefined") window.location.href = "/login"; throw new ApiError("Session expired", 401); }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(typeof body.detail === "string" ? body.detail : "Request failed", res.status);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

/** Records scoped to the signed-in farmer, or to `farmerId` when an agent acts on behalf. */
const scope = (farmerId?: string) => farmerId ?? getSession()?.user.id ?? "";
const actor = () => getSession()?.user.name ?? "System";
function audit(action: string) { db().audit.unshift({ id: uid(), actor: actor(), action, date: new Date().toISOString() }); }

type Table = "harvests" | "expenses" | "losses" | "inventory" | "traces" | "reports";
function resource<T extends { id: string; farmer_id: string }>(path: string, table: Table) {
  const t = () => db()[table] as unknown as T[];
  return {
    list: async (farmerId?: string): Promise<T[]> => {
      if (!USE_MOCK) { const r = await http<{ data: T[] } | T[]>(`${path}${farmerId ? `?farmer_id=${farmerId}` : ""}`); return Array.isArray(r) ? r : r.data; }
      await wait(); const id = scope(farmerId); return t().filter((x) => x.farmer_id === id).sort((a, b) => ((b as any).date ?? "").localeCompare((a as any).date ?? ""));
    },
    all: async (): Promise<T[]> => (USE_MOCK ? (await wait(), [...t()]) : resource<T>(path, table).list()),
    get: async (id: string): Promise<T> => {
      if (!USE_MOCK) return http<T>(`${path}/${id}`);
      const r = t().find((x) => x.id === id); if (!r) throw new ApiError("Not found", 404); return r;
    },
    create: async (data: Omit<T, "id" | "farmer_id"> & { farmer_id?: string }): Promise<T> => {
      if (!USE_MOCK) return http<T>(path, { method: "POST", body: JSON.stringify(data) });
      await wait(); const rec = { ...data, id: uid(), farmer_id: scope(data.farmer_id) } as unknown as T;
      t().push(rec); audit(`Added ${table.replace(/s$/, "")} record`); save(); return rec;
    },
    update: async (id: string, data: Partial<T>): Promise<T> => {
      if (!USE_MOCK) return http<T>(`${path}/${id}`, { method: "PATCH", body: JSON.stringify(data) });
      await wait(); const r = t().find((x) => x.id === id); if (!r) throw new ApiError("Not found", 404);
      Object.assign(r, data); save(); return r;
    },
    remove: async (id: string): Promise<void> => {
      if (!USE_MOCK) return http<void>(`${path}/${id}`, { method: "DELETE" });
      await wait(); const arr = t(); const i = arr.findIndex((x) => x.id === id); if (i >= 0) arr.splice(i, 1); save();
    },
  };
}

const restCropCalendar: CropCalendarApi = {
  list: (farmerId?: string) => USE_MOCK ? mockCropCalendar.list(farmerId) : http(`/crop-seasons${farmerId ? `?farmer_id=${farmerId}` : ""}`),
  createSeason: (season, activities = []) => USE_MOCK ? mockCropCalendar.createSeason(season, activities) : http("/crop-seasons", { method: "POST", body: JSON.stringify({ season, activities }) }),
  updateSeason: (id, season) => USE_MOCK ? mockCropCalendar.updateSeason(id, season) : http(`/crop-seasons/${id}`, { method: "PATCH", body: JSON.stringify(season) }),
  createActivity: (activity) => USE_MOCK ? mockCropCalendar.createActivity(activity) : http("/crop-activities", { method: "POST", body: JSON.stringify(activity) }),
  updateActivity: (id, activity) => USE_MOCK ? mockCropCalendar.updateActivity(id, activity) : http(`/crop-activities/${id}`, { method: "PATCH", body: JSON.stringify(activity) }),
  completeActivity: (id, completion) => USE_MOCK ? mockCropCalendar.completeActivity(id, completion) : http(`/crop-activities/${id}/complete`, { method: "POST", body: JSON.stringify(completion) }),
  skipActivity: (id, reason) => USE_MOCK ? mockCropCalendar.skipActivity(id, reason) : http(`/crop-activities/${id}/skip`, { method: "POST", body: JSON.stringify({ reason }) }),
  setActivityApproval: (id, approved) => USE_MOCK ? mockCropCalendar.setActivityApproval(id, approved) : http(`/crop-activities/${id}/approval`, { method: "PATCH", body: JSON.stringify({ approved }) }),
};

const restApi = {
  cropCalendar: restCropCalendar,
  harvests: {
    ...resource<Harvest>("/harvests", "harvests"),
    /** Creates a harvest with a fresh batch code and its first trace stage. */
    async createWithBatch(d: Omit<Harvest, "id" | "farmer_id" | "batch_code"> & { farmer_id?: string }) {
      const code = batchCode(d.crop);
      const h = await api.harvests.create({ ...d, batch_code: code });
      await api.traces.create({ farmer_id: h.farmer_id, batch_code: code, stage: "Harvest", location: d.location, actor: actor(), date: d.date });
      return h;
    },
  },
  expenses: resource<Expense>("/farm-expenses", "expenses"),
  losses: resource<LossRecord>("/loss-records", "losses"),
  inventory: resource<InventoryTx>("/inventory-transactions", "inventory"),
  traces: resource<Trace>("/traceability", "traces"),
  reports: {
    ...resource<FarmReport>("/farm-reports", "reports"),
    async generate(period: string, farmerId?: string): Promise<FarmReport> {
      if (!USE_MOCK) return http<FarmReport>("/farm-reports/generate", { method: "POST", body: JSON.stringify({ period, farmer_id: farmerId }) });
      const id = scope(farmerId); const D = db();
      const sum = <X,>(a: X[], f: (x: X) => number) => a.reduce((s, x) => s + f(x), 0);
      const mine = <X extends { farmer_id: string }>(a: X[]) => a.filter((x) => x.farmer_id === id);
      const rep: FarmReport = { id: uid(), farmer_id: id, title: `Farm report — ${period}`, period, created_at: new Date().toISOString(),
        summary: { harvest_kg: sum(mine(D.harvests), (h) => h.quantity_kg), expenses_lrd: sum(mine(D.expenses), (e) => e.amount), losses_kg: sum(mine(D.losses), (l) => l.quantity_kg), batches: mine(D.harvests).length } };
      D.reports.unshift(rep); save(); await wait(); return rep;
    },
  },
  /** Public buyer lookup: returns only non-private trace info. */
  async batchHistory(code: string): Promise<{ batch_code: string; crop: string; county: string; grade: string | null; stages: Omit<Trace, "farmer_id">[]; activities: { id: string; title: string; planned_date: string; actual_date: string; notes: string }[] } | null> {
    const c = code.trim().toUpperCase();
    if (!USE_MOCK) return http<any>(`/traceability/batches/${encodeURIComponent(c)}`).catch(() => null);
    await wait(400); const D = db();
    const h = D.harvests.find((x) => x.batch_code.toUpperCase() === c); if (!h) return null;
    const farmer = D.users.find((u) => u.id === h.farmer_id);
    const approved = approvedBatchActivities(D.crop_activities, D.crop_seasons, h);
    return { batch_code: h.batch_code, crop: h.crop, county: farmer?.county ?? "", grade: h.grade,
      stages: D.traces.filter((t) => t.batch_code === h.batch_code).sort((a, b) => a.date.localeCompare(b.date)).map(({ farmer_id: _f, actor, ...t }) => ({ ...t, actor: actor === farmer?.name ? "Registered farmer" : actor })),
      activities: approved.map((activity) => ({ id: activity.id, title: activity.title, planned_date: activity.planned_date, actual_date: activity.actual_date!, notes: activity.actual_notes })) };
  },

  auth: {
    async me(): Promise<User> {
      if (!USE_MOCK) return http<User>("/users/me");
      const user = db().users.find((u) => u.id === getSession()?.user.id);
      if (!user) throw new ApiError("Sign in to continue", 401);
      const { password: _password, ...profile } = user;
      return profile;
    },
    async login(phone: string, password: string): Promise<{ token: string; user: User }> {
      if (!USE_MOCK) {
        const body = new URLSearchParams({ username: phone, password });
        const res = await fetch(`${BASE}/api/v1/login/access-token`, { method: "POST", body });
        if (!res.ok) throw new ApiError("Wrong phone number or password", res.status);
        const { access_token } = await res.json();
        const me = await fetch(`${BASE}/api/v1/users/me`, { headers: { Authorization: `Bearer ${access_token}` } }).then((r) => r.json());
        return { token: access_token, user: { role: "farmer", active: true, ...me } };
      }
      await wait(500);
      const u = db().users.find((x) => x.phone === phone);
      if (!u || u.password !== password) throw new ApiError("Wrong phone number or password", 401);
      if (!u.active) throw new ApiError("This account is deactivated. Contact the Ministry.", 403);
      const { password: _p, ...user } = u; return { token: `mock.${u.id}.${Date.now()}`, user };
    },
    async signup(d: { phone: string; name: string; county: string; farm_type: string; password: string; role: Role; agent_id?: string }): Promise<User> {
      if (!USE_MOCK) return http<User>(d.role === "farmer" ? "/farmers/signup" : "/users/signup", { method: "POST", body: JSON.stringify(d) });
      await wait(500);
      if (db().users.some((x) => x.phone === d.phone)) throw new ApiError("This phone number is already registered");
      const u = { ...d, id: uid(), active: true, verified: DEFAULT_FARMER_VERIFIED, created_at: new Date().toISOString() };
      db().users.push(u); audit(d.agent_id ? `Registered farmer ${d.name}` : `New ${d.role} sign-up: ${d.name}`); save();
      const { password: _p, ...user } = u; return user;
    },
    async recover(contact: string) { if (!USE_MOCK) return http(`/password-recovery/${encodeURIComponent(contact)}`, { method: "POST" }); await wait(600); return undefined; },
    async changePassword(current: string, next: string) {
      if (!USE_MOCK) return http("/users/me/password", { method: "PATCH", body: JSON.stringify({ current_password: current, new_password: next }) });
      await wait(); const u = db().users.find((x) => x.id === getSession()?.user.id);
      if (!u || u.password !== current) throw new ApiError("Current password is wrong"); u.password = next; save(); return undefined;
    },
    async updateMe(data: Partial<User>): Promise<User> {
      if (!USE_MOCK) return http<User>("/users/me", { method: "PATCH", body: JSON.stringify(data) });
      await wait(); const u = db().users.find((x) => x.id === getSession()?.user.id)!; Object.assign(u, data); save();
      const { password: _p, ...user } = u; return user;
    },
  },
  users: {
    async setVerification(id: string, verified: boolean): Promise<User> {
      if (!USE_MOCK) throw new ApiError("Farmer verification requires the Appwrite connection.");
      const actor = db().users.find((u) => u.id === getSession()?.user.id);
      const target = db().users.find((u) => u.id === id);
      if (!actor || !target) throw new ApiError("Account not found", 404);
      Object.assign(target, farmerVerificationPatch(actor, target.role, verified));
      audit(`${verified ? "Verified farmer" : "Removed farmer verification"}: ${target.name}`);
      save();
      const { password: _password, ...profile } = target;
      return profile;
    },
    async list(): Promise<User[]> {
      if (!USE_MOCK) { const r = await http<{ data: User[] }>("/users/"); return r.data; }
      await wait(); return db().users.map(({ password: _p, ...u }) => u);
    },
    async update(id: string, data: Partial<User>) {
      if (!USE_MOCK) return http<User>(`/users/${id}`, { method: "PATCH", body: JSON.stringify(data) });
      await wait(); const u = db().users.find((x) => x.id === id)!; Object.assign(u, data);
      audit(`Updated user ${u.name}${data.active === false ? " (deactivated)" : ""}`); save(); return u;
    },
    async remove(id: string) {
      if (!USE_MOCK) return http(`/users/${id}`, { method: "DELETE" });
      await wait(); const D = db(); const u = D.users.find((x) => x.id === id); D.users = D.users.filter((x) => x.id !== id); audit(`Deleted user ${u?.name}`); save(); return undefined;
    },
    async createAdmin(d: { name: string; phone: string; password: string }) {
      if (!USE_MOCK) return http<User>("/users/", { method: "POST", body: JSON.stringify({ ...d, role: "admin" }) });
      return api.auth.signup({ ...d, county: "Montserrado", farm_type: "Mixed", role: "admin" });
    },
  },
  async auditLog(): Promise<AuditLog[]> { await wait(); return [...db().audit]; },
  async health(): Promise<boolean> { if (USE_MOCK) return true; try { await http("/utils/health-check/"); return true; } catch { return false; } },
  /** National aggregates are derived from the same backend records in every mode. */
  async national(): Promise<{ users: User[]; harvests: Harvest[]; losses: LossRecord[]; traces: Trace[]; expenses: Expense[]; inventory: InventoryTx[] }> {
    if (!USE_MOCK) {
      const [users, harvests, losses, traces, expenses, inventory] = await Promise.all([
        restApi.users.list(), restApi.harvests.all(), restApi.losses.all(), restApi.traces.all(), restApi.expenses.all(), restApi.inventory.all(),
      ]);
      return { users, harvests, losses, traces, expenses, inventory };
    }
    await wait(); const D = db(); return { users: D.users, harvests: D.harvests, losses: D.losses, traces: D.traces, expenses: D.expenses, inventory: D.inventory };
  },
};

/** Appwrite is preferred when configured; the previous REST API and browser demo remain fallbacks. */
export const api = (USE_APPWRITE ? appwriteApi : restApi) as unknown as typeof restApi;

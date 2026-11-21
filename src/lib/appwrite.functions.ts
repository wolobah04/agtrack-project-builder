import { createServerFn } from "@tanstack/react-start";
import { Query } from "appwrite";
import { z } from "zod";
import { canAccessFarmer, canManageUsers, canReadAudit, canRegisterForAgent, type AppwriteActor } from "./appwrite-access";
import { COUNTY_NAMES, FARM_TYPES, LIBERIA_PHONE } from "./constants";
import type { Role, User } from "./types";

const PROJECT_FALLBACK = "6b011308003b57f341b6";
type Config = { endpoint: string; projectId: string; apiKey: string; databaseId: string };
type Row = { $id: string; $createdAt: string; [key: string]: any };
type Actor = AppwriteActor & { name: string; phone: string; county: string; farm_type: string; created_at: string; agent_id?: string; email?: string };

class HttpError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

async function request<T>(config: Config, path: string, options: { method?: string; body?: unknown; jwt?: string; admin?: boolean; queries?: string[] } = {}): Promise<T> {
  const url = new URL(`${config.endpoint.replace(/\/$/, "")}${path}`);
  for (const query of options.queries ?? []) url.searchParams.append("queries[]", query);
  const headers = new Headers({ "X-Appwrite-Project": config.projectId });
  if (options.admin !== false) headers.set("X-Appwrite-Key", config.apiKey);
  if (options.jwt) headers.set("X-Appwrite-Session", options.jwt);
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  const response = await fetch(url, { method: options.method ?? "GET", headers, ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}) });
  const text = await response.text();
  let body: { message?: string; [key: string]: any } = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = text ? { message: text } : {}; }
  if (!response.ok) {
    console.error(`Appwrite request failed [${response.status}] ${options.method ?? "GET"} ${path}: ${body.message ?? text}`);
    throw new HttpError(body.message ?? "Appwrite request failed", response.status);
  }
  return body as T;
}

function requireConfig(config: Config): Config {
  if (!config.projectId || !config.apiKey) throw new Error("Appwrite server configuration is incomplete.");
  return config;
}

const tablePath = (config: Config, table: string, id?: string) => `/tablesdb/${encodeURIComponent(config.databaseId)}/tables/${table}/rows${id ? `/${encodeURIComponent(id)}` : ""}`;

function fromRow(row: Row): { id: string; created_at: string; [key: string]: any } {
  const { $id, $createdAt, $updatedAt: _updated, $databaseId: _database, $tableId: _table, $permissions: _permissions, $sequence: _sequence, ...data } = row;
  const result: { id: string; created_at: string; [key: string]: any } = { ...data, id: $id, created_at: typeof data["created_at"] === "string" ? data["created_at"] : $createdAt };
  if (typeof result["summary"] === "string") {
    try { result["summary"] = JSON.parse(result["summary"]); } catch { result["summary"] = {}; }
  }
  return result;
}

async function getRow(config: Config, table: string, id: string): Promise<Row> {
  return request<Row>(config, tablePath(config, table, id));
}

async function listRows(config: Config, table: string, queries: string[] = []): Promise<{ id: string; created_at: string; [key: string]: any }[]> {
  const rows: { id: string; created_at: string; [key: string]: any }[] = [];
  const pageSize = 100;
  for (let offset = 0; offset < 10000; offset += pageSize) {
    const result = await request<{ rows: Row[] }>(config, tablePath(config, table), { queries: [...queries, Query.limit(pageSize), Query.offset(offset)] });
    rows.push(...result.rows.map(fromRow));
    if (result.rows.length < pageSize) break;
  }
  return rows;
}

async function createRow(config: Config, table: string, id: string | undefined, data: Record<string, unknown>) {
  const row = await request<Row>(config, tablePath(config, table), { method: "POST", body: { rowId: id ?? "unique()", data } });
  return fromRow(row);
}

async function updateRow(config: Config, table: string, id: string, data: Record<string, unknown>) {
  const row = await request<Row>(config, tablePath(config, table, id), { method: "PATCH", body: { data } });
  return fromRow(row);
}

async function deleteRow(config: Config, table: string, id: string): Promise<void> {
  await request(config, tablePath(config, table, id), { method: "DELETE" });
}

async function getActor(config: Config, token: string): Promise<Actor> {
  if (!token) throw new HttpError("Sign in to continue", 401);
  let auth: { $id: string; email?: string };
  try { auth = await request<{ $id: string; email?: string }>(config, "/account", { jwt: token, admin: false }); }
  catch { throw new HttpError("Your session has expired. Please sign in again.", 401); }
  const [profile, roleRow] = await Promise.all([getRow(config, "users", auth.$id), getRow(config, "user_roles", auth.$id)]);
  const user = toUser(fromRow(profile), fromRow(roleRow));
  if (!user.active) throw new HttpError("This account is deactivated. Contact the Ministry.", 403);
  return user;
}

function toUser(profile: Row | { id: string; created_at: string; [key: string]: any }, roleRow: Row | { id: string; [key: string]: any }): Actor {
  return {
    id: profile.id, name: String(profile["name"]), phone: String(profile["phone"]), county: String(profile["county"]),
    farm_type: String(profile["farm_type"]), role: roleRow["role"] as Role, active: profile["active"] !== false,
    created_at: String(profile.created_at), ...(profile["agent_id"] ? { agent_id: String(profile["agent_id"]) } : {}),
    ...(profile["email"] ? { email: String(profile["email"]) } : {}),
  };
}

async function audit(config: Config, actor: string, action: string): Promise<void> {
  try { await createRow(config, "audit", undefined, { actor, action, date: new Date().toISOString() }); }
  catch (error) { console.error("Could not write Appwrite audit entry", error); }
}

async function assignedFarmers(config: Config, agentId: string): Promise<string[]> {
  const profiles = await listRows(config, "users", [Query.equal("agent_id", agentId)]);
  return profiles.map((profile) => profile.id);
}

async function assertFarmerAccess(config: Config, actor: Actor, farmerId: string): Promise<void> {
  const assigned = actor.role === "agent" ? await assignedFarmers(config, actor.id) : [];
  if (!canAccessFarmer(actor, farmerId, assigned)) throw new HttpError("You do not have access to this farmer's records", 403);
}

const phoneEmail = (phone: string) => `${phone.replace(/\D/g, "")}@phone.agtrack.app`;
const signupSchema = z.object({
  phone: z.string().regex(LIBERIA_PHONE, "Enter a valid Liberian phone number"),
  name: z.string().trim().min(2).max(80),
  county: z.enum(COUNTY_NAMES as [string, ...string[]]),
  farm_type: z.enum(FARM_TYPES as [string, ...string[]]),
  password: z.string().min(8, "Password needs at least 8 characters").max(72),
  role: z.enum(["farmer", "agent"]),
  agent_id: z.string().max(36).optional(),
  jwt: z.string().optional(),
});

async function addMembership(config: Config, role: Role, userId: string): Promise<void> {
  try { await request(config, `/teams/${role}s/memberships`, { method: "POST", body: { userId, roles: ["member"] } }); }
  catch (error) { if (!(error instanceof HttpError && error.status === 409)) console.error("Could not add Appwrite team membership", error); }
}

async function createAccount(config: Config, input: { phone: string; name: string; county: string; farm_type: string; password: string; role: Role; agent_id?: string }): Promise<User> {
  const auth = await request<{ $id: string; $createdAt: string }>(config, "/users", {
    method: "POST", body: { userId: "unique()", email: phoneEmail(input.phone), phone: input.phone, password: input.password, name: input.name },
  });
  try {
    const profile = await createRow(config, "users", auth.$id, {
      name: input.name, phone: input.phone, county: input.county, farm_type: input.farm_type,
      active: true, ...(input.agent_id ? { agent_id: input.agent_id } : {}), email: phoneEmail(input.phone),
    });
    await createRow(config, "user_roles", auth.$id, { user_id: auth.$id, role: input.role });
    await request(config, `/users/${auth.$id}/prefs`, { method: "PATCH", body: { prefs: { name: input.name, phone: input.phone, county: input.county, farm_type: input.farm_type, role: input.role, ...(input.agent_id ? { agent_id: input.agent_id } : {}) } } }).catch(() => undefined);
    await addMembership(config, input.role, auth.$id);
    await audit(config, input.agent_id ? "Field agent" : "System", `${input.agent_id ? "Registered farmer" : `New ${input.role} sign-up`}: ${input.name}`);
    return toUser(profile, { id: auth.$id, role: input.role });
  } catch (error) {
    await request(config, `/users/${auth.$id}`, { method: "DELETE" }).catch(() => undefined);
    throw error;
  }
}

export const registerAppwriteUser = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => signupSchema.parse(input))
  .handler(async ({ data }) => {
    const config = requireConfig({ endpoint: process.env["APPWRITE_ENDPOINT"] ?? "https://cloud.appwrite.io/v1", projectId: process.env["APPWRITE_PROJECT_ID"] ?? PROJECT_FALLBACK, apiKey: process.env["APPWRITE_API_KEY"] ?? "", databaseId: process.env["APPWRITE_DATABASE_ID"] ?? "agtrack" });
    if (data.agent_id) {
      const actor = await getActor(config, data.jwt ?? "");
      if (!canRegisterForAgent(actor, data.agent_id)) throw new HttpError("You cannot register farmers for another agent", 403);
      if (data.role !== "farmer") throw new HttpError("Agents can only register farmer accounts", 403);
    }
    try {
      return await createAccount(config, {
        phone: data.phone, name: data.name, county: data.county, farm_type: data.farm_type,
        password: data.password, role: data.role, ...(data.agent_id ? { agent_id: data.agent_id } : {}),
      });
    }
    catch (error) {
      if (error instanceof HttpError && error.status === 409) throw new Error("This phone number is already registered");
      throw error;
    }
  });

export const getAppwriteMe = createServerFn({ method: "POST" })
  .inputValidator((input: { jwt: string }) => input)
  .handler(async ({ data }): Promise<User> => {
    const config = requireConfig({ endpoint: process.env["APPWRITE_ENDPOINT"] ?? "https://cloud.appwrite.io/v1", projectId: process.env["APPWRITE_PROJECT_ID"] ?? PROJECT_FALLBACK, apiKey: process.env["APPWRITE_API_KEY"] ?? "", databaseId: process.env["APPWRITE_DATABASE_ID"] ?? "agtrack" });
    return getActor(config, data.jwt);
  });

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const farmerId = z.string().min(1).max(36);
const recordSchemas = {
  harvests: z.object({ farmer_id: farmerId.optional(), crop: z.string().trim().min(1).max(100), quantity_kg: z.number().nonnegative(), grade: z.enum(["A", "B", "C"]).nullable(), date: dateField, batch_code: z.string().min(4).max(50), location: z.string().trim().min(1).max(200) }),
  expenses: z.object({ farmer_id: farmerId.optional(), category: z.string().min(1).max(80), amount: z.number().nonnegative(), description: z.string().max(500), date: dateField }),
  losses: z.object({ farmer_id: farmerId.optional(), crop: z.string().trim().min(1).max(100), quantity_kg: z.number().nonnegative(), cause: z.string().min(1).max(100), date: dateField }),
  inventory: z.object({ farmer_id: farmerId.optional(), item: z.string().trim().min(1).max(120), type: z.enum(["in", "out"]), quantity: z.number(), unit: z.string().min(1).max(30), date: dateField, note: z.string().max(500) }),
  traces: z.object({ farmer_id: farmerId.optional(), batch_code: z.string().min(4).max(50), stage: z.enum(["Harvest", "Storage", "Transfer", "Sale"]), location: z.string().min(1).max(200), actor: z.string().min(1).max(128), date: dateField }),
  reports: z.object({ farmer_id: farmerId.optional(), title: z.string().min(1).max(200), period: z.string().min(1).max(50), summary: z.record(z.string(), z.number()) }),
};
type Resource = keyof typeof recordSchemas;
const recordInput = z.object({
  jwt: z.string(), action: z.enum(["list", "get", "create", "update", "remove"]), resource: z.enum(["harvests", "expenses", "losses", "inventory", "traces", "reports"]),
  farmerId: z.string().optional(), id: z.string().optional(), all: z.boolean().optional(), data: z.record(z.string(), z.unknown()).optional(),
});

function cleanRecord(resource: Resource, input: Record<string, unknown>, partial = false): Record<string, unknown> {
  const schema = recordSchemas[resource];
  const parsed = (partial ? schema.partial() : schema).parse(input) as Record<string, unknown>;
  delete parsed["farmer_id"];
  if (resource === "reports" && parsed["summary"] && typeof parsed["summary"] !== "string") parsed["summary"] = JSON.stringify(parsed["summary"]);
  return parsed;
}

export const mutateAppwriteRecord = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => recordInput.parse(input))
  .handler(async ({ data }) => {
    const config = requireConfig({ endpoint: process.env["APPWRITE_ENDPOINT"] ?? "https://cloud.appwrite.io/v1", projectId: process.env["APPWRITE_PROJECT_ID"] ?? PROJECT_FALLBACK, apiKey: process.env["APPWRITE_API_KEY"] ?? "", databaseId: process.env["APPWRITE_DATABASE_ID"] ?? "agtrack" });
    const actor = await getActor(config, data.jwt);
    const resource = data.resource;
    if (data.action === "list") {
      if (data.all && actor.role !== "admin") throw new HttpError("Ministry access required", 403);
      const target = actor.role === "farmer" ? actor.id : data.farmerId;
      if (target) await assertFarmerAccess(config, actor, target);
      const queries: string[] = [];
      if (target) queries.push(Query.equal("farmer_id", target));
      else if (actor.role === "agent") {
        const ids = await assignedFarmers(config, actor.id);
        if (!ids.length) return [];
        queries.push(Query.equal("farmer_id", ids));
      }
      const orderField = resource === "reports" ? "created_at" : "date";
      queries.push(Query.orderDesc(orderField));
      return listRows(config, resource, queries);
    }
    if (!data.id && ["get", "update", "remove"].includes(data.action)) throw new HttpError("Record ID is required", 400);
    if (data.action === "create") {
      const clean = cleanRecord(resource, data.data ?? {});
      const owner = typeof data.data?.["farmer_id"] === "string" ? data.data["farmer_id"] : actor.id;
      await assertFarmerAccess(config, actor, owner);
      const payload = { ...clean, farmer_id: owner, ...(resource === "reports" ? { created_at: new Date().toISOString() } : {}) };
      const created = await createRow(config, resource, undefined, payload);
      await audit(config, actor.name, `Added ${resource.replace(/s$/, "")} record`);
      return created;
    }
    const existing = await getRow(config, resource, data.id!);
    await assertFarmerAccess(config, actor, String(existing["farmer_id"]));
    if (data.action === "get") return fromRow(existing);
    if (data.action === "update") {
      const updated = await updateRow(config, resource, data.id!, cleanRecord(resource, data.data ?? {}, true));
      await audit(config, actor.name, `Updated ${resource.replace(/s$/, "")} record`);
      return updated;
    }
    await deleteRow(config, resource, data.id!);
    await audit(config, actor.name, `Deleted ${resource.replace(/s$/, "")} record`);
    return { ok: true };
  });

const manageInput = z.object({ jwt: z.string(), action: z.enum(["list", "updateMe", "update", "remove", "createAdmin"]), id: z.string().optional(), data: z.record(z.string(), z.unknown()).optional() });
const profileFields = z.object({ name: z.string().trim().min(2).max(80).optional(), county: z.enum(COUNTY_NAMES as [string, ...string[]]).optional(), farm_type: z.enum(FARM_TYPES as [string, ...string[]]).optional() });
const adminFields = z.object({ name: z.string().trim().min(2).max(80), phone: z.string().regex(LIBERIA_PHONE), password: z.string().min(8).max(72) });

async function listUsers(config: Config, actor: Actor): Promise<User[]> {
  const profiles = await listRows(config, "users", actor.role === "agent" ? [Query.equal("agent_id", actor.id)] : []);
  const roles = await listRows(config, "user_roles");
  const byId = new Map(roles.map((role) => [role.id, role]));
  return profiles.filter((profile) => byId.has(profile.id)).map((profile) => toUser(profile, byId.get(profile.id)!));
}

export const manageAppwriteUsers = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => manageInput.parse(input))
  .handler(async ({ data }) => {
    const config = requireConfig({ endpoint: process.env["APPWRITE_ENDPOINT"] ?? "https://cloud.appwrite.io/v1", projectId: process.env["APPWRITE_PROJECT_ID"] ?? PROJECT_FALLBACK, apiKey: process.env["APPWRITE_API_KEY"] ?? "", databaseId: process.env["APPWRITE_DATABASE_ID"] ?? "agtrack" });
    const actor = await getActor(config, data.jwt);
    if (data.action === "list") {
      if (actor.role === "farmer") throw new HttpError("You cannot list users", 403);
      return listUsers(config, actor);
    }
    if (data.action === "updateMe") {
      const clean = profileFields.parse(data.data ?? {});
      if (Object.keys(clean).length) {
        await updateRow(config, "users", actor.id, clean);
        if (clean.name) await request(config, `/users/${actor.id}/name`, { method: "PATCH", body: { name: clean.name } });
      }
      await audit(config, actor.name, "Updated own profile");
      const [profile, role] = await Promise.all([getRow(config, "users", actor.id), getRow(config, "user_roles", actor.id)]);
      return toUser(fromRow(profile), fromRow(role));
    }
    if (!canManageUsers(actor)) throw new HttpError("Ministry admin access required", 403);
    if (data.action === "createAdmin") {
      const clean = adminFields.parse(data.data ?? {});
      return createAccount(config, { ...clean, role: "admin", county: "Montserrado", farm_type: "Mixed" });
    }
    if (!data.id) throw new HttpError("User ID is required", 400);
    if (data.id === actor.id) throw new HttpError("You cannot deactivate or delete your own account here", 400);
    const profile = await getRow(config, "users", data.id);
    const role = await getRow(config, "user_roles", data.id);
    if (data.action === "update") {
      const active = typeof data.data?.["active"] === "boolean" ? data.data["active"] : undefined;
      const clean = profileFields.parse(data.data ?? {});
      if (Object.keys(clean).length) await updateRow(config, "users", data.id, clean);
      if (active !== undefined) {
        await updateRow(config, "users", data.id, { active });
        await request(config, `/users/${data.id}/status`, { method: "PATCH", body: { status: active } });
      }
      await audit(config, actor.name, `Updated user ${profile["name"]}${active === false ? " (deactivated)" : ""}`);
      const updated = await getRow(config, "users", data.id);
      return toUser(fromRow(updated), fromRow(role));
    }
    await deleteRow(config, "users", data.id);
    await deleteRow(config, "user_roles", data.id);
    await request(config, `/users/${data.id}`, { method: "DELETE" });
    await audit(config, actor.name, `Deleted user ${profile["name"]}`);
    return { ok: true };
  });

export const getAppwriteAuditLog = createServerFn({ method: "POST" })
  .inputValidator((input: { jwt: string }) => input)
  .handler(async ({ data }) => {
    const config = requireConfig({ endpoint: process.env["APPWRITE_ENDPOINT"] ?? "https://cloud.appwrite.io/v1", projectId: process.env["APPWRITE_PROJECT_ID"] ?? PROJECT_FALLBACK, apiKey: process.env["APPWRITE_API_KEY"] ?? "", databaseId: process.env["APPWRITE_DATABASE_ID"] ?? "agtrack" });
    const actor = await getActor(config, data.jwt);
    if (!canReadAudit(actor)) throw new HttpError("Ministry admin access required", 403);
    return listRows(config, "audit", [Query.orderDesc("date")]);
  });

export const appwriteNationalData = createServerFn({ method: "POST" })
  .inputValidator((input: { jwt: string }) => input)
  .handler(async ({ data }) => {
    const config = requireConfig({ endpoint: process.env["APPWRITE_ENDPOINT"] ?? "https://cloud.appwrite.io/v1", projectId: process.env["APPWRITE_PROJECT_ID"] ?? PROJECT_FALLBACK, apiKey: process.env["APPWRITE_API_KEY"] ?? "", databaseId: process.env["APPWRITE_DATABASE_ID"] ?? "agtrack" });
    const actor = await getActor(config, data.jwt);
    if (!canManageUsers(actor)) throw new HttpError("Ministry admin access required", 403);
    const [users, harvests, losses, traces, expenses] = await Promise.all([
      listUsers(config, actor), listRows(config, "harvests"), listRows(config, "losses"), listRows(config, "traces"), listRows(config, "expenses"),
    ]);
    return { users, harvests, losses, traces, expenses };
  });

export const getAppwriteBatchHistory = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string }) => ({ code: input.code.trim().toUpperCase().slice(0, 50) }))
  .handler(async ({ data }) => {
    const config = requireConfig({ endpoint: process.env["APPWRITE_ENDPOINT"] ?? "https://cloud.appwrite.io/v1", projectId: process.env["APPWRITE_PROJECT_ID"] ?? PROJECT_FALLBACK, apiKey: process.env["APPWRITE_API_KEY"] ?? "", databaseId: process.env["APPWRITE_DATABASE_ID"] ?? "agtrack" });
    if (!/^[A-Z0-9-]{4,50}$/.test(data.code)) return null;
    const harvests = await listRows(config, "harvests", [Query.equal("batch_code", data.code)]);
    const harvest = harvests[0];
    if (!harvest) return null;
    const [farmer, traces] = await Promise.all([
      getRow(config, "users", String(harvest["farmer_id"])),
      listRows(config, "traces", [Query.equal("batch_code", data.code), Query.orderAsc("date")]),
    ]);
    return {
      batch_code: String(harvest["batch_code"]), crop: String(harvest["crop"]), county: String(farmer["county"] ?? ""), grade: harvest["grade"] ? String(harvest["grade"]) : null,
      stages: traces.map((trace) => ({ id: trace.id, batch_code: String(trace["batch_code"]), stage: trace["stage"], location: String(trace["location"]), actor: trace["actor"] === farmer["name"] ? "Registered farmer" : String(trace["actor"]), date: String(trace["date"]) })),
    };
  });

const chatInput = z.object({ jwt: z.string(), action: z.enum(["list", "add", "clear"]), role: z.enum(["user", "bot"]).optional(), text: z.string().trim().min(1).max(4000).optional() });
export const appwriteChatHistory = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => chatInput.parse(input))
  .handler(async ({ data }) => {
    const config = requireConfig({ endpoint: process.env["APPWRITE_ENDPOINT"] ?? "https://cloud.appwrite.io/v1", projectId: process.env["APPWRITE_PROJECT_ID"] ?? PROJECT_FALLBACK, apiKey: process.env["APPWRITE_API_KEY"] ?? "", databaseId: process.env["APPWRITE_DATABASE_ID"] ?? "agtrack" });
    const actor = await getActor(config, data.jwt);
    if (data.action === "add") {
      if (!data.role || !data.text) throw new HttpError("Message text is required", 400);
      const row = await createRow(config, "chat_messages", undefined, { user_id: actor.id, role: data.role, text: data.text, created_at: new Date().toISOString() });
      return { id: row.id, role: data.role, text: data.text };
    }
    const rows = await listRows(config, "chat_messages", [Query.equal("user_id", actor.id), Query.orderAsc("created_at")]);
    if (data.action === "clear") {
      await Promise.all(rows.map((row) => deleteRow(config, "chat_messages", row.id)));
      return { ok: true };
    }
    return rows.map((row) => ({ id: row.id, role: row["role"], text: row["text"] }));
  });

export const appwriteHealthCheck = createServerFn({ method: "GET" }).handler(async () => {
  const endpoint = process.env["APPWRITE_ENDPOINT"] ?? "https://cloud.appwrite.io/v1";
  try {
    const response = await fetch(`${endpoint.replace(/\/$/, "")}/health`);
    return response.ok;
  } catch { return false; }
});

const serverConfig = (): Config => requireConfig({ endpoint: process.env["APPWRITE_ENDPOINT"] ?? "https://cloud.appwrite.io/v1", projectId: process.env["APPWRITE_PROJECT_ID"] ?? PROJECT_FALLBACK, apiKey: process.env["APPWRITE_API_KEY"] ?? "", databaseId: process.env["APPWRITE_DATABASE_ID"] ?? "agtrack" });

// Sign-in runs on the server so the browser never calls Appwrite directly (no CORS / web-platform setup needed).
export const loginAppwrite = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ phone: z.string().min(4).max(20), password: z.string().min(1).max(72) }).parse(input))
  .handler(async ({ data }): Promise<{ token: string; user: User }> => {
    const config = serverConfig();
    let session: { secret?: string };
    try { session = await request<{ secret?: string }>(config, "/account/sessions/email", { method: "POST", body: { email: phoneEmail(data.phone), password: data.password } }); }
    catch (error) {
      if (error instanceof HttpError && (error.status === 401 || error.status === 400)) throw new Error("Wrong phone number or password.");
      throw error;
    }
    if (!session.secret) throw new Error("Sign-in failed. Please try again.");
    const user = await getActor(config, session.secret);
    return { token: session.secret, user };
  });

export const accountAppwrite = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ jwt: z.string().min(1), action: z.enum(["logout", "password"]), current: z.string().max(72).optional(), next: z.string().min(8).max(72).optional() }).parse(input))
  .handler(async ({ data }) => {
    const config = serverConfig();
    if (data.action === "logout") {
      await request(config, "/account/sessions/current", { method: "DELETE", jwt: data.jwt, admin: false }).catch(() => undefined);
      return { ok: true };
    }
    try { await request(config, "/account/password", { method: "PATCH", jwt: data.jwt, admin: false, body: { password: data.next, oldPassword: data.current } }); }
    catch (error) { if (error instanceof HttpError && error.status === 401) throw new Error("Your current password is wrong."); throw error; }
    return { ok: true };
  });

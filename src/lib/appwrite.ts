import { Account, AppwriteException, Client } from "appwrite";
import { clearSession, getSession } from "./auth";
import { batchCode } from "./mock-db";
import type { AuditLog, Expense, FarmReport, Harvest, InventoryTx, LossRecord, Role, Trace, User } from "./types";
import {
  appwriteChatHistory,
  appwriteHealthCheck,
  appwriteNationalData,
  getAppwriteAuditLog,
  getAppwriteBatchHistory,
  getAppwriteMe,
  manageAppwriteUsers,
  mutateAppwriteRecord,
  registerAppwriteUser,
} from "./appwrite.functions";

const ENDPOINT = (import.meta.env["VITE_APPWRITE_ENDPOINT"] as string | undefined) ?? "https://cloud.appwrite.io/v1";
const PROJECT_ID = (import.meta.env["VITE_APPWRITE_PROJECT_ID"] as string | undefined) ?? "6b011308003b57f341b6";
export const USE_APPWRITE = Boolean(PROJECT_ID) && import.meta.env["VITE_USE_MOCK"] !== "true";

let account: Account | undefined;
function getAccount(): Account {
  if (!USE_APPWRITE) throw new Error("Appwrite is not configured. Add VITE_APPWRITE_PROJECT_ID.");
  if (!account) account = new Account(new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID));
  return account;
}

function message(error: unknown): Error {
  if (error instanceof AppwriteException) {
    if (error.code === 401) return new Error("Wrong phone number or password, or your session has expired.");
    return new Error(error.message);
  }
  return error instanceof Error ? error : new Error("Appwrite request failed");
}

async function jwt(): Promise<string> {
  try {
    return (await getAccount().createJWT()).jwt;
  } catch (error) {
    if (error instanceof AppwriteException && error.code === 401) clearSession();
    throw message(error);
  }
}

export const phoneEmail = (phone: string) => `${phone.replace(/\D/g, "")}@phone.agtrack.app`;

type Resource = "harvests" | "expenses" | "losses" | "inventory" | "traces" | "reports";
type Row = { id: string; farmer_id: string };

function resource<R extends Row>(name: Resource) {
  return {
    list: async (farmerId?: string): Promise<R[]> => mutateAppwriteRecord({ data: { jwt: await jwt(), action: "list", resource: name, ...(farmerId ? { farmerId } : {}) } }) as unknown as Promise<R[]>,
    all: async (): Promise<R[]> => mutateAppwriteRecord({ data: { jwt: await jwt(), action: "list", resource: name, all: true } }) as unknown as Promise<R[]>,
    get: async (id: string): Promise<R> => mutateAppwriteRecord({ data: { jwt: await jwt(), action: "get", resource: name, id } }) as unknown as Promise<R>,
    create: async (data: Record<string, unknown>): Promise<R> => mutateAppwriteRecord({ data: { jwt: await jwt(), action: "create", resource: name, data } }) as unknown as Promise<R>,
    update: async (id: string, data: Record<string, unknown>): Promise<R> => mutateAppwriteRecord({ data: { jwt: await jwt(), action: "update", resource: name, id, data } }) as unknown as Promise<R>,
    remove: async (id: string): Promise<void> => { await mutateAppwriteRecord({ data: { jwt: await jwt(), action: "remove", resource: name, id } }); },
  };
}

// Keep the resource IDs explicit: they are also used by scripts/setup-appwrite.mjs.
const records = {
  harvests: resource<Harvest>("harvests"),
  expenses: resource<Expense>("expenses"),
  losses: resource<LossRecord>("losses"),
  inventory: resource<InventoryTx>("inventory"),
  traces: resource<Trace>("traces"),
  reports: resource<FarmReport>("reports"),
};

export const appwriteApi = {
  harvests: {
    ...records.harvests,
    async createWithBatch(data: Omit<Harvest, "id" | "farmer_id" | "batch_code"> & { farmer_id?: string }) {
      const code = batchCode(data.crop);
      const harvest = await records.harvests.create({ ...data, batch_code: code });
      await records.traces.create({ farmer_id: harvest.farmer_id, batch_code: code, stage: "Harvest", location: data.location, actor: getSession()?.user.name ?? "Registered farmer", date: data.date });
      return harvest;
    },
  },
  expenses: records.expenses,
  losses: records.losses,
  inventory: records.inventory,
  traces: records.traces,
  reports: {
    ...records.reports,
    async generate(period: string, farmerId?: string): Promise<FarmReport> {
      const [harvestRows, expenseRows, lossRows] = await Promise.all([
        records.harvests.list(farmerId), records.expenses.list(farmerId), records.losses.list(farmerId),
      ]);
      const sum = <T,>(rows: T[], value: (row: T) => number) => rows.reduce((total, row) => total + value(row), 0);
      return records.reports.create({
        ...(farmerId ? { farmer_id: farmerId } : {}), title: `Farm report — ${period}`, period,
        summary: { harvest_kg: sum(harvestRows, (h) => h.quantity_kg), expenses_lrd: sum(expenseRows, (e) => e.amount), losses_kg: sum(lossRows, (l) => l.quantity_kg), batches: harvestRows.length },
      });
    },
  },
  async batchHistory(code: string) {
    return getAppwriteBatchHistory({ data: { code } });
  },
  auth: {
    async login(phone: string, password: string): Promise<{ token: string; user: User }> {
      try {
        if (getSession()) await getAccount().deleteSession("current").catch(() => undefined);
        const session = await getAccount().createEmailPasswordSession(phoneEmail(phone), password);
        const user = await getAppwriteMe({ data: { jwt: await jwt() } });
        return { token: session.$id, user };
      } catch (error) {
        throw message(error);
      }
    },
    async signup(data: { phone: string; name: string; county: string; farm_type: string; password: string; role: Role; agent_id?: string }): Promise<User> {
      const token = data.agent_id ? await jwt() : undefined;
      return registerAppwriteUser({ data: { ...data, ...(token ? { jwt: token } : {}) } });
    },
    async recover(_contact: string): Promise<undefined> {
      throw new Error("Phone-only accounts cannot receive email reset links. Ask your field agent or Ministry admin to reset your password.");
    },
    async changePassword(current: string, next: string): Promise<undefined> {
      try { await getAccount().updatePassword(next, current); } catch (error) { throw message(error); }
      return undefined;
    },
    async updateMe(data: Partial<User>): Promise<User> {
      return manageAppwriteUsers({ data: { jwt: await jwt(), action: "updateMe", data } }) as Promise<User>;
    },
  },
  users: {
    async list(): Promise<User[]> {
      return manageAppwriteUsers({ data: { jwt: await jwt(), action: "list" } }) as Promise<User[]>;
    },
    async update(id: string, data: Partial<User>): Promise<User> {
      return manageAppwriteUsers({ data: { jwt: await jwt(), action: "update", id, data } }) as Promise<User>;
    },
    async remove(id: string): Promise<undefined> {
      await manageAppwriteUsers({ data: { jwt: await jwt(), action: "remove", id } });
      return undefined;
    },
    async createAdmin(data: { name: string; phone: string; password: string }): Promise<User> {
      return manageAppwriteUsers({ data: { jwt: await jwt(), action: "createAdmin", data } }) as Promise<User>;
    },
  },
  async auditLog(): Promise<AuditLog[]> {
    const rows = await getAppwriteAuditLog({ data: { jwt: await jwt() } });
    return rows.map((row) => ({ id: row.id, actor: String(row["actor"]), action: String(row["action"]), date: String(row["date"]) }));
  },
  async health(): Promise<boolean> {
    return appwriteHealthCheck();
  },
  async national() {
    return appwriteNationalData({ data: { jwt: await jwt() } });
  },
};

export interface AppwriteChatMessage { id: string; role: "user" | "bot"; text: string }
export const appwriteChat = {
  async list(): Promise<AppwriteChatMessage[]> {
    return appwriteChatHistory({ data: { jwt: await jwt(), action: "list" } }) as Promise<AppwriteChatMessage[]>;
  },
  async add(role: "user" | "bot", text: string): Promise<AppwriteChatMessage> {
    return appwriteChatHistory({ data: { jwt: await jwt(), action: "add", role, text } }) as Promise<AppwriteChatMessage>;
  },
  async clear(): Promise<void> {
    await appwriteChatHistory({ data: { jwt: await jwt(), action: "clear" } });
  },
};

export async function appwriteLogout(): Promise<void> {
  if (USE_APPWRITE) await getAccount().deleteSession("current").catch(() => undefined);
  clearSession();
}

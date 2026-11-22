import { clearSession, getSession } from "./auth";
import { batchCode } from "./mock-db";
import { questionCounty } from "./farm-assistant";
import { getForecast } from "./weather";
import type { AuditLog, CropActivity, CropSeason, Expense, FarmReport, Harvest, InventoryTx, LossRecord, Role, Trace, User } from "./types";
import type { ActivityDraft, CompletionDraft, CropCalendarApi, ScheduleDraft, SeasonDraft } from "./crop-calendar";
import {
  appwriteChatHistory,
  appwriteHealthCheck,
  askFarmAssistant,
  appwriteNationalData,
  getAppwriteAuditLog,
  getAppwriteBatchHistory,
  getAppwriteMe,
  accountAppwrite,
  loginAppwrite,
  manageAppwriteUsers,
  mutateAppwriteRecord,
  mutateCropCalendar,
  registerAppwriteUser,
  transcribeFarmAudio,
} from "./appwrite.functions";

const PROJECT_ID = (import.meta.env["VITE_APPWRITE_PROJECT_ID"] as string | undefined) ?? "6b011308003b57f341b6";
export const USE_APPWRITE = Boolean(PROJECT_ID) && import.meta.env["VITE_USE_MOCK"] !== "true";

function message(error: unknown): Error {
  return error instanceof Error ? error : new Error("Appwrite request failed");
}

async function jwt(): Promise<string> {
  const token = getSession()?.token;
  if (!token) throw new Error("Please sign in again.");
  return token;
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

const cropCalendar: CropCalendarApi = {
  list: async (farmerId?: string) => mutateCropCalendar({ data: { jwt: await jwt(), action: "list", ...(farmerId ? { farmerId } : {}) } }) as unknown as Promise<{ seasons: CropSeason[]; activities: CropActivity[] }>,
  createSeason: async (season: SeasonDraft, activities: ScheduleDraft[] = []) => mutateCropCalendar({ data: { jwt: await jwt(), action: "createSeason", data: { ...season, activities } } }) as unknown as Promise<CropSeason>,
  updateSeason: async (id: string, season: Partial<SeasonDraft>) => mutateCropCalendar({ data: { jwt: await jwt(), action: "updateSeason", id, data: season } }) as unknown as Promise<CropSeason>,
  createActivity: async (activity: ActivityDraft) => mutateCropCalendar({ data: { jwt: await jwt(), action: "createActivity", data: activity } }) as unknown as Promise<CropActivity>,
  updateActivity: async (id: string, activity: Partial<ActivityDraft>) => mutateCropCalendar({ data: { jwt: await jwt(), action: "updateActivity", id, data: activity } }) as unknown as Promise<CropActivity>,
  completeActivity: async (id: string, completion: CompletionDraft) => mutateCropCalendar({ data: { jwt: await jwt(), action: "complete", id, data: completion } }) as unknown as Promise<CropActivity>,
  skipActivity: async (id: string, reason: string) => mutateCropCalendar({ data: { jwt: await jwt(), action: "skip", id, data: { reason } } }) as unknown as Promise<CropActivity>,
  setActivityApproval: async (id: string, approved: boolean) => mutateCropCalendar({ data: { jwt: await jwt(), action: "approval", id, data: { approved } } }) as unknown as Promise<CropActivity>,
};

export const appwriteApi = {
  cropCalendar,
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
    async me(): Promise<User> {
      return getAppwriteMe({ data: { jwt: await jwt() } });
    },
    async login(phone: string, password: string): Promise<{ token: string; user: User }> {
      try {
        return await loginAppwrite({ data: { phone, password } });
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
      try { await accountAppwrite({ data: { jwt: await jwt(), action: "password", current, next } }); } catch (error) { throw message(error); }
      return undefined;
    },
    async updateMe(data: Partial<User>): Promise<User> {
      return manageAppwriteUsers({ data: { jwt: await jwt(), action: "updateMe", data } }) as Promise<User>;
    },
  },
  users: {
    async setVerification(id: string, verified: boolean): Promise<User> {
      return manageAppwriteUsers({ data: { jwt: await jwt(), action: "verify", id, data: { verified } } }) as Promise<User>;
    },
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

export const appwriteAssistant = {
  async ask(message: string, history: { role: "user" | "bot"; text: string }[]) {
    const token = await jwt();
    const county = questionCounty(message, getSession()?.user.county ?? "Montserrado");
    // Browser requests avoid the shared server-IP rate limit that can block Open-Meteo on Workers.
    const forecast = await getForecast(county).catch(() => null);
    return askFarmAssistant({ data: { jwt: token, message, history, forecast } });
  },
  async transcribe(audioBase64: string, mimeType: "audio/webm" | "audio/ogg" | "audio/mp4") {
    return transcribeFarmAudio({ data: { jwt: await jwt(), audioBase64, mimeType } });
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
  const token = getSession()?.token;
  if (USE_APPWRITE && token) await accountAppwrite({ data: { jwt: token, action: "logout" } }).catch(() => undefined);
  clearSession();
}

import { getSession } from "./auth";
import {
  completionExpense,
  completionUpdate,
  nextRecurringActivity,
  type ActivityDraft,
  type CompletionDraft,
  type CropCalendarApi,
  type ScheduleDraft,
  type SeasonDraft,
} from "./crop-calendar";
import { db, save, uid } from "./mock-db";
import type { CropActivity, CropSeason } from "./types";

const owner = (farmerId?: string) => farmerId ?? getSession()?.user.id ?? "";
const season = (id: string): CropSeason => {
  const value = db().crop_seasons.find((item) => item.id === id);
  if (!value) throw new Error("Crop season not found");
  return value;
};
const activity = (id: string): CropActivity => {
  const value = db().crop_activities.find((item) => item.id === id);
  if (!value) throw new Error("Planned activity not found");
  return value;
};
function addActivity(farmerId: string, draft: ActivityDraft): CropActivity {
  const value: CropActivity = {
    ...draft,
    id: uid(),
    farmer_id: farmerId,
    status: "planned",
    actual_date: null,
    actual_notes: "",
    skip_reason: "",
    approved_for_public: false,
    created_at: new Date().toISOString(),
  };
  db().crop_activities.push(value);
  return value;
}

export const mockCropCalendar: CropCalendarApi = {
  async list(farmerId?: string) {
    const id = owner(farmerId);
    return {
      seasons: db()
        .crop_seasons.filter((item) => item.farmer_id === id)
        .sort((a, b) => b.planting_date.localeCompare(a.planting_date)),
      activities: db()
        .crop_activities.filter((item) => item.farmer_id === id)
        .sort((a, b) => a.planned_date.localeCompare(b.planned_date)),
    };
  },
  async createSeason(draft: SeasonDraft, activities: ScheduleDraft[] = []) {
    const value: CropSeason = {
      ...draft,
      id: uid(),
      farmer_id: owner(),
      created_at: new Date().toISOString(),
    };
    db().crop_seasons.push(value);
    activities.forEach((item) => addActivity(value.farmer_id, { ...item, season_id: value.id }));
    save();
    return value;
  },
  async updateSeason(id: string, draft: Partial<SeasonDraft>) {
    const value = season(id);
    Object.assign(value, draft);
    save();
    return value;
  },
  async createActivity(draft: ActivityDraft) {
    const value = addActivity(season(draft.season_id).farmer_id, draft);
    save();
    return value;
  },
  async updateActivity(id: string, draft: Partial<ActivityDraft>) {
    const value = activity(id);
    if (value.status !== "planned")
      throw new Error("Completed or skipped activities stay in the activity history");
    Object.assign(value, draft);
    save();
    return value;
  },
  async completeActivity(id: string, completion: CompletionDraft) {
    const value = activity(id);
    if (value.status !== "planned")
      throw new Error("This work has already been completed or skipped");
    const expense = completionExpense(value, season(value.season_id), completion);
    Object.assign(value, completionUpdate(value, completion));
    if (expense) db().expenses.push({ ...expense, id: uid(), farmer_id: value.farmer_id });
    const next = nextRecurringActivity(value);
    if (next) addActivity(value.farmer_id, next);
    save();
    return value;
  },
  async skipActivity(id: string, reason: string) {
    const value = activity(id);
    if (value.status !== "planned") throw new Error("Only planned work can be skipped");
    Object.assign(value, {
      status: "skipped" as const,
      skip_reason: reason,
      approved_for_public: false,
    });
    const next = nextRecurringActivity(value);
    if (next) addActivity(value.farmer_id, next);
    save();
    return value;
  },
  async setActivityApproval(id: string, approved: boolean) {
    const value = activity(id);
    if (value.status !== "completed")
      throw new Error("Only completed work can be approved for buyers");
    value.approved_for_public = approved;
    save();
    return value;
  },
};

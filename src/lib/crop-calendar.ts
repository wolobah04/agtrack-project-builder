import type { CropActivity, CropSeason, Expense, Harvest } from "./types";

export type SeasonDraft = Pick<
  CropSeason,
  "name" | "crop" | "variety" | "plot" | "planting_date" | "end_date" | "batch_code" | "status"
>;
export type ActivityDraft = Pick<
  CropActivity,
  "season_id" | "title" | "planned_date" | "planned_end_date" | "notes" | "recurrence_days"
>;
export type ScheduleDraft = Omit<ActivityDraft, "season_id">;
export type CompletionDraft = {
  actual_date: string;
  actual_notes: string;
  approved_for_public: boolean;
  expense?: { category: string; amount: number } | undefined;
};

export type CropCalendarApi = {
  list(farmerId?: string): Promise<{ seasons: CropSeason[]; activities: CropActivity[] }>;
  createSeason(season: SeasonDraft, activities?: ScheduleDraft[]): Promise<CropSeason>;
  updateSeason(id: string, season: Partial<SeasonDraft>): Promise<CropSeason>;
  createActivity(activity: ActivityDraft): Promise<CropActivity>;
  updateActivity(id: string, activity: Partial<ActivityDraft>): Promise<CropActivity>;
  completeActivity(id: string, completion: CompletionDraft): Promise<CropActivity>;
  skipActivity(id: string, reason: string): Promise<CropActivity>;
  setActivityApproval(id: string, approved: boolean): Promise<CropActivity>;
};

type TemplateItem = {
  title: string;
  offset: number;
  duration?: number;
  notes: string;
  recurrence_days?: number;
};

const genericTemplate: TemplateItem[] = [
  {
    title: "Land preparation",
    offset: -14,
    duration: 7,
    notes: "Clear and prepare the plot for the variety and local soil conditions.",
  },
  {
    title: "Planting",
    offset: 0,
    notes: "Record the planting method, seed or planting material, and labor used.",
  },
  {
    title: "Field check",
    offset: 7,
    notes: "Check establishment, pests, disease, weeds, and soil moisture.",
    recurrence_days: 7,
  },
  {
    title: "Weeding and field care",
    offset: 21,
    duration: 3,
    notes: "Adjust to weed pressure and crop growth in this plot.",
  },
  {
    title: "Harvest window",
    offset: 90,
    duration: 14,
    notes: "Suggested only: confirm crop maturity before harvesting.",
  },
];

const templates: Record<string, TemplateItem[]> = {
  Rice: [
    {
      title: "Land preparation",
      offset: -21,
      duration: 7,
      notes: "Clear, plough, and level the field; adjust for rainfall and soil conditions.",
    },
    {
      title: "Seed selection and nursery",
      offset: -14,
      duration: 3,
      notes: "Prepare the selected rice variety and nursery or direct-seeding materials.",
    },
    {
      title: "Sowing or transplanting",
      offset: 0,
      duration: 3,
      notes: "Use the method and spacing appropriate for this variety and plot.",
    },
    {
      title: "Field check",
      offset: 7,
      notes: "Check water, establishment, pests, disease, and weeds.",
      recurrence_days: 7,
    },
    {
      title: "First weeding",
      offset: 21,
      duration: 3,
      notes: "Suggested timing; inspect the field and adjust to weed pressure.",
    },
    {
      title: "Fertilizer and labor",
      offset: 28,
      duration: 3,
      notes: "Apply only according to the crop need and local agronomic advice.",
    },
    {
      title: "Second weeding",
      offset: 45,
      duration: 3,
      notes: "Keep the field clean while avoiding damage to the rice plants.",
    },
    {
      title: "Harvest window",
      offset: 105,
      duration: 15,
      notes: "Planning aid only: confirm maturity and choose suitable drying weather.",
    },
  ],
  Cassava: [
    {
      title: "Land preparation",
      offset: -21,
      duration: 7,
      notes: "Prepare ridges or mounds suited to the plot and drainage.",
    },
    {
      title: "Prepare planting material",
      offset: -3,
      notes: "Select healthy cassava stems from a trusted source.",
    },
    {
      title: "Planting",
      offset: 0,
      duration: 3,
      notes: "Adjust spacing and planting time to the variety and rainfall.",
    },
    {
      title: "Field check",
      offset: 14,
      notes: "Check sprouting, gaps, weeds, pests, and disease.",
      recurrence_days: 14,
    },
    {
      title: "First weeding",
      offset: 30,
      duration: 5,
      notes: "Weed carefully without damaging shallow roots or stems.",
    },
    {
      title: "Second weeding",
      offset: 75,
      duration: 5,
      notes: "Adjust to actual weed pressure and crop canopy.",
    },
    {
      title: "Harvest window",
      offset: 270,
      duration: 60,
      notes: "Confirm the variety's maturity and planned market or processing date.",
    },
  ],
  Vegetables: [
    {
      title: "Nursery and bed preparation",
      offset: -14,
      duration: 7,
      notes: "Prepare clean nursery media and raised beds where needed.",
    },
    {
      title: "Transplanting or direct sowing",
      offset: 0,
      duration: 2,
      notes: "Adjust spacing to the selected vegetable variety.",
    },
    {
      title: "Field check",
      offset: 3,
      notes: "Check watering, pests, disease, and plant establishment.",
      recurrence_days: 7,
    },
    {
      title: "Weeding and labor",
      offset: 14,
      duration: 2,
      notes: "Avoid root damage and record paid labor if used.",
    },
    {
      title: "Top dressing or crop feeding",
      offset: 21,
      notes: "Use local recommendations and observe crop response.",
    },
    {
      title: "Harvest window",
      offset: 45,
      duration: 21,
      notes: "Harvest at the maturity and quality required by your buyers.",
    },
  ],
};

export function addDaysISO(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function cropTemplate(crop: string): TemplateItem[] {
  return (
    templates[crop] ??
    templates[
      crop
        .trim()
        .toLowerCase()
        .replace(/^./, (letter) => letter.toUpperCase())
    ] ??
    genericTemplate
  );
}

export function createSeasonSchedule(crop: string, plantingDate: string): ScheduleDraft[] {
  return cropTemplate(crop).map((item) => ({
    title: item.title,
    planned_date: addDaysISO(plantingDate, item.offset),
    planned_end_date: item.duration ? addDaysISO(plantingDate, item.offset + item.duration) : null,
    notes: item.notes,
    recurrence_days: item.recurrence_days ?? null,
  }));
}

export type DueState = "completed" | "skipped" | "overdue" | "due" | "upcoming";
export function suggestedSeasonEnd(crop: string, plantingDate: string): string {
  const days = cropTemplate(crop).reduce(
    (latest, item) => Math.max(latest, item.offset + (item.duration ?? 0)),
    0,
  );
  return addDaysISO(plantingDate, days);
}

export function seasonDateError(plantingDate: string, endDate: string): string | null {
  if (!plantingDate || !endDate) return null;
  return endDate < plantingDate ? "The ending date cannot be before the planting date." : null;
}

export function daysBetweenISO(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00.000Z`);
  const end = Date.parse(`${to}T00:00:00.000Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.round((end - start) / 86_400_000);
}

export function seasonEndLabel(endDate: string | null, today: string): string | null {
  if (!endDate) return null;
  const days = daysBetweenISO(today, endDate);
  if (days === 0) return "Ending today";
  const amount = Math.abs(days);
  const unit = amount === 1 ? "day" : "days";
  return days > 0 ? `${amount} ${unit} to go` : `${amount} ${unit} past`;
}

export function activityDueState(
  activity: Pick<CropActivity, "status" | "planned_date" | "planned_end_date">,
  today: string,
): DueState {
  if (activity.status === "completed" || activity.status === "skipped") return activity.status;
  if (
    activity.planned_date <= today &&
    (activity.planned_end_date ?? activity.planned_date) >= today
  )
    return "due";
  return (activity.planned_end_date ?? activity.planned_date) < today ? "overdue" : "upcoming";
}

export function nextRecurringActivity(activity: CropActivity): ActivityDraft | null {
  if (!activity.recurrence_days) return null;
  return {
    season_id: activity.season_id,
    title: activity.title,
    planned_date: addDaysISO(activity.planned_date, activity.recurrence_days),
    planned_end_date: activity.planned_end_date
      ? addDaysISO(activity.planned_end_date, activity.recurrence_days)
      : null,
    notes: activity.notes,
    recurrence_days: activity.recurrence_days,
  };
}

export function completionUpdate(
  activity: CropActivity,
  completion: CompletionDraft,
): Partial<CropActivity> {
  return {
    status: "completed",
    actual_date: completion.actual_date,
    actual_notes: completion.actual_notes.trim(),
    approved_for_public: completion.approved_for_public,
    skip_reason: "",
  };
}

export function completionExpense(
  activity: CropActivity,
  season: CropSeason,
  completion: CompletionDraft,
): Omit<Expense, "id" | "farmer_id"> | null {
  if (!completion.expense) return null;
  return {
    category: completion.expense.category,
    amount: completion.expense.amount,
    description: `${activity.title} — ${season.name}`,
    date: completion.actual_date,
    season_id: season.id,
    activity_id: activity.id,
  };
}

export function approvedBatchActivities(
  activities: CropActivity[],
  seasons: CropSeason[],
  harvest: Pick<Harvest, "batch_code" | "date" | "farmer_id">,
): CropActivity[] {
  const seasonById = new Map(seasons.map((season) => [season.id, season]));
  return activities
    .filter((activity) => {
      const season = seasonById.get(activity.season_id);
      return (
        activity.farmer_id === harvest.farmer_id &&
        season?.farmer_id === harvest.farmer_id &&
        season.batch_code === harvest.batch_code &&
        activity.status === "completed" &&
        activity.approved_for_public &&
        !!activity.actual_date &&
        activity.actual_date <= harvest.date
      );
    })
    .sort((a, b) => (a.actual_date ?? "").localeCompare(b.actual_date ?? ""));
}

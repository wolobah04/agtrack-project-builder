import { describe, expect, it } from "vitest";
import {
  activityDueState,
  approvedBatchActivities,
  completionExpense,
  createSeasonSchedule,
  nextRecurringActivity,
} from "./crop-calendar";
import type { CropActivity, CropSeason } from "./types";

const season: CropSeason = {
  id: "season-rice",
  farmer_id: "farmer-1",
  name: "Rice — North plot",
  crop: "Rice",
  variety: "NERICA-L19",
  plot: "North plot",
  planting_date: "2026-11-03",
  batch_code: "LR-RIC-1001",
  status: "active",
  created_at: "2026-10-01",
};
const activity: CropActivity = {
  id: "weeding-1",
  farmer_id: "farmer-1",
  season_id: season.id,
  title: "Weeding",
  planned_date: "2026-11-17",
  planned_end_date: null,
  notes: "",
  status: "planned",
  actual_date: null,
  actual_notes: "",
  skip_reason: "",
  recurrence_days: null,
  approved_for_public: false,
  created_at: "2026-10-01",
};

describe("crop season schedules", () => {
  it("builds editable rice suggestions relative to the planting date", () => {
    const schedule = createSeasonSchedule("Rice", "2026-11-03");
    expect(schedule.find((item) => item.title === "Land preparation")?.planned_date).toBe(
      "2026-10-13",
    );
    expect(schedule.find((item) => item.title === "Sowing or transplanting")?.planned_date).toBe(
      "2026-11-03",
    );
    expect(schedule.find((item) => item.title === "Harvest window")?.planned_end_date).toBe(
      "2027-03-03",
    );
  });

  it("marks Tuesday's planned weeding due on Tuesday and overdue on Wednesday", () => {
    expect(activityDueState(activity, "2026-11-17")).toBe("due");
    expect(activityDueState(activity, "2026-11-18")).toBe("overdue");
  });

  it("schedules the next recurring field check seven days after the original plan", () => {
    const next = nextRecurringActivity({ ...activity, title: "Field check", recurrence_days: 7 });
    expect(next?.planned_date).toBe("2026-11-24");
    expect(next?.title).toBe("Field check");
  });

  it("creates one labor expense linked to the completed activity and actual Thursday date", () => {
    const expense = completionExpense(activity, season, {
      actual_date: "2026-11-19",
      actual_notes: "Weeded north plot",
      approved_for_public: true,
      expense: { category: "Labor", amount: 2500 },
    });
    expect(expense).toMatchObject({
      category: "Labor",
      amount: 2500,
      date: "2026-11-19",
      season_id: season.id,
      activity_id: activity.id,
    });
  });
});

describe("public batch activity privacy and harvest cutoff", () => {
  const completed = {
    ...activity,
    status: "completed" as const,
    actual_date: "2026-11-19",
    approved_for_public: true,
  };
  it("excludes Thursday weeding from a batch harvested Wednesday", () => {
    expect(
      approvedBatchActivities([completed], [season], {
        farmer_id: "farmer-1",
        batch_code: season.batch_code!,
        date: "2026-11-18",
      }),
    ).toEqual([]);
  });

  it("includes approved Thursday weeding for Friday's harvest but keeps unapproved and other-season work private", () => {
    const unapproved = { ...completed, id: "private", approved_for_public: false };
    const otherSeason = { ...completed, id: "other", season_id: "other-season" };
    const result = approvedBatchActivities([completed, unapproved, otherSeason], [season], {
      farmer_id: "farmer-1",
      batch_code: season.batch_code!,
      date: "2026-11-20",
    });
    expect(result.map((item) => item.id)).toEqual([activity.id]);
  });
});

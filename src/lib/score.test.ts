import { describe, expect, it } from "vitest";
import { computeFarmScore, computeScore } from "./score";

const h = (id: string, kg: number, grade: "A" | "B" | "C" | null, code: string) => ({ id, farmer_id: "f", crop: "Rice", quantity_kg: kg, grade, date: "2026-11-01", batch_code: code, location: "" });
const t = (code: string) => ({ id: Math.random() + "", farmer_id: "f", batch_code: code, stage: "Harvest" as const, location: "", actor: "", date: "2026-11-01" });
const now = new Date("2026-11-20");

describe("quality score", () => {
  it("gives 100 for no losses, 8 active days, grade A, all batches traced", () => {
    const dates = Array.from({ length: 8 }, (_, i) => `2026-11-${10 + i}`);
    expect(computeScore({ harvests: [h("1", 100, "A", "X")], losses: [], traces: [t("X"), t("X")], recordDates: dates, now }).total).toBe(100);
  });

  it("gives zero loss points at a 50% loss rate", () => {
    const s = computeScore({ harvests: [h("1", 100, "A", "X")], losses: [{ id: "l", farmer_id: "f", crop: "Rice", quantity_kg: 100, cause: "Pests", date: "2026-11-01" }], traces: [], recordDates: [], now });
    expect(s.parts.loss).toBe(0);
  });

  it("gives half grade points when a harvest is not graded", () => {
    expect(computeScore({ harvests: [h("1", 100, null, "X")], losses: [], traces: [], recordDates: [], now }).parts.grade).toBe(10);
  });

  it("returns zero instead of a demo-looking score when the farmer has no records", () => {
    const score = computeFarmScore({ harvests: [], losses: [], traces: [], expenses: [], inventory: [] }, now);
    expect(score.total).toBe(0);
    expect(score.hasRecords).toBe(false);
    expect(score.recordCount).toBe(0);
  });

  it("awards no production or grade points when only an expense exists", () => {
    const score = computeFarmScore({ harvests: [], losses: [], traces: [], expenses: [{ date: "2026-11-20" }], inventory: [] }, now);
    expect(score.parts.loss).toBe(0);
    expect(score.parts.grade).toBe(0);
    expect(score.parts.completeness).toBe(25 / 8);
    expect(score.recordCount).toBe(1);
  });

  it("counts every saved record and uses all five record types", () => {
    const score = computeFarmScore({
      harvests: [h("1", 100, "A", "X")], losses: [], traces: [t("X"), t("X")],
      expenses: [{ date: "2026-11-12" }], inventory: [{ date: "2026-11-13" }],
    }, now);
    expect(score.recordCount).toBe(5);
    expect(score.harvestedKg).toBe(100);
    expect(score.tracedBatches).toBe(1);
    expect(score.activeDays).toBe(3);
  });
});

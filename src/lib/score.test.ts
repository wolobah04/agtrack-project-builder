import { describe, expect, it } from "vitest";
import { computeScore } from "./score";
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
  it("gives half grade points when nothing is graded", () => {
    expect(computeScore({ harvests: [h("1", 100, null, "X")], losses: [], traces: [], recordDates: [], now }).parts.grade).toBe(10);
  });
});

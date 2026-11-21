import type { Harvest, LossRecord, Trace } from "./types";

/** Transparent quality score (0-100). Weights are shown in the UI. */
export const SCORE_WEIGHTS = { loss: 30, completeness: 25, grade: 20, trace: 25 } as const;
const GRADE_VALUE = { A: 1, B: 0.7, C: 0.4 } as const;

export interface ScoreInput { harvests: Harvest[]; losses: LossRecord[]; traces: Trace[]; recordDates: string[]; now?: Date }

export function computeScore({ harvests, losses, traces, recordDates, now = new Date() }: ScoreInput) {
  const harvested = harvests.reduce((s, h) => s + h.quantity_kg, 0);
  const lost = losses.reduce((s, l) => s + l.quantity_kg, 0);
  const lossRate = harvested + lost === 0 ? 0 : lost / (harvested + lost);
  // 0% loss = full points; 50% loss or more = 0 points
  const loss = SCORE_WEIGHTS.loss * (1 - Math.min(1, lossRate * 2));

  // Expect activity on at least 8 different days in the last 30 days
  const since = now.getTime() - 30 * 864e5;
  const days = new Set(recordDates.filter((d) => new Date(d).getTime() >= since).map((d) => d.slice(0, 10)));
  const completeness = SCORE_WEIGHTS.completeness * Math.min(1, days.size / 8);

  const graded = harvests.filter((h) => h.grade);
  const grade = graded.length === 0
    ? SCORE_WEIGHTS.grade / 2
    : SCORE_WEIGHTS.grade * (graded.reduce((s, h) => s + GRADE_VALUE[h.grade!], 0) / graded.length);

  // A batch is fully traced when it has at least 2 stages recorded
  const stages = new Map<string, number>();
  traces.forEach((t) => stages.set(t.batch_code, (stages.get(t.batch_code) ?? 0) + 1));
  const traced = harvests.filter((h) => (stages.get(h.batch_code) ?? 0) >= 2).length;
  const trace = harvests.length === 0 ? 0 : SCORE_WEIGHTS.trace * (traced / harvests.length);

  const parts = { loss, completeness, grade, trace };
  const total = Math.round(loss + completeness + grade + trace);
  return { total, parts, lossRate, activeDays: days.size, tracedShare: harvests.length ? traced / harvests.length : 0 };
}

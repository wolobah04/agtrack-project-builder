import type { Expense, Harvest, InventoryTx, LossRecord, Trace } from "./types";

/** Transparent quality score (0-100). Weights are shown in the UI. */
export const SCORE_WEIGHTS = { loss: 30, completeness: 25, grade: 20, trace: 25 } as const;
const GRADE_VALUE = { A: 1, B: 0.7, C: 0.4 } as const;

export interface ScoreInput {
  harvests: Harvest[];
  losses: LossRecord[];
  traces: Trace[];
  recordDates: string[];
  recordCount?: number;
  now?: Date;
}

export interface FarmScoreRecords {
  harvests: Harvest[];
  losses: LossRecord[];
  traces: Trace[];
  expenses: Pick<Expense, "date">[];
  inventory: Pick<InventoryTx, "date">[];
}

/** Builds one canonical input so the dashboard, Ministry view and AI use identical records. */
export function scoreInputFromRecords(records: FarmScoreRecords, now?: Date): ScoreInput {
  const activityRecords = [records.harvests, records.losses, records.expenses, records.inventory];
  return {
    harvests: records.harvests,
    losses: records.losses,
    traces: records.traces,
    recordDates: activityRecords.flat().map((record) => record.date),
    recordCount: activityRecords.reduce((total, rows) => total + rows.length, 0) + records.traces.length,
    ...(now ? { now } : {}),
  };
}

export function computeFarmScore(records: FarmScoreRecords, now?: Date) {
  return computeScore(scoreInputFromRecords(records, now));
}

export function computeScore({ harvests, losses, traces, recordDates, recordCount, now = new Date() }: ScoreInput) {
  const harvestedKg = harvests.reduce((sum, harvest) => sum + harvest.quantity_kg, 0);
  const lostKg = losses.reduce((sum, loss) => sum + loss.quantity_kg, 0);
  const savedRecords = recordCount ?? recordDates.length + traces.length;
  const lossRate = harvestedKg + lostKg === 0 ? 0 : lostKg / (harvestedKg + lostKg);
  // No production records means no loss points; otherwise 0% loss = full and 50%+ = zero.
  const loss = harvestedKg + lostKg === 0 ? 0 : SCORE_WEIGHTS.loss * (1 - Math.min(1, lossRate * 2));

  // Expect activity on at least 8 different days in the last 30 days.
  const since = now.getTime() - 30 * 864e5;
  const days = new Set(recordDates.filter((date) => new Date(date).getTime() >= since).map((date) => date.slice(0, 10)));
  const completeness = SCORE_WEIGHTS.completeness * Math.min(1, days.size / 8);

  const graded = harvests.filter((harvest) => harvest.grade);
  const grade = harvests.length === 0
    ? 0
    : graded.length === 0
      ? SCORE_WEIGHTS.grade / 2
      : SCORE_WEIGHTS.grade * (graded.reduce((sum, harvest) => sum + GRADE_VALUE[harvest.grade!], 0) / graded.length);

  // A batch is fully traced when it has at least 2 stages recorded.
  const stages = new Map<string, number>();
  traces.forEach((trace) => stages.set(trace.batch_code, (stages.get(trace.batch_code) ?? 0) + 1));
  const tracedBatches = harvests.filter((harvest) => (stages.get(harvest.batch_code) ?? 0) >= 2).length;
  const trace = harvests.length === 0 ? 0 : SCORE_WEIGHTS.trace * (tracedBatches / harvests.length);

  const parts = { loss, completeness, grade, trace };
  const total = Math.round(loss + completeness + grade + trace);
  return {
    total,
    parts,
    lossRate,
    activeDays: days.size,
    tracedShare: harvests.length ? tracedBatches / harvests.length : 0,
    harvestedKg,
    lostKg,
    batchCount: harvests.length,
    tracedBatches,
    recordCount: savedRecords,
    hasRecords: savedRecords > 0,
  };
}

import { SCORE_WEIGHTS } from "@/lib/score";
import type { computeScore } from "@/lib/score";
import { Panel } from "./ui";

type S = ReturnType<typeof computeScore>;
const labels = {
  loss: ["Low losses", "With production records: full points at 0% loss, zero at 50% loss or more"],
  completeness: ["Record keeping", "Activity on 8+ different days in the last 30 days"],
  grade: ["Harvest grade", "Average grade: A = full, B = 70%, C = 40%. Half points for ungraded harvests"],
  trace: ["Traceability", "Share of batches with 2 or more trace stages"],
} as const;

export function Gauge({ value }: { value: number }) {
  const r = 70, c = Math.PI * r;
  return (
    <svg viewBox="0 0 180 105" className="w-full max-w-xs" role="img" aria-label={`Score ${value} of 100`}>
      <defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stopColor="var(--lime)" /><stop offset="1" stopColor="var(--leaf)" /></linearGradient></defs>
      <path d="M20 95 A70 70 0 0 1 160 95" fill="none" stroke="var(--muted)" strokeWidth="16" strokeLinecap="round" />
      <path d="M20 95 A70 70 0 0 1 160 95" fill="none" stroke="url(#g)" strokeWidth="16" strokeLinecap="round" strokeDasharray={`${(value / 100) * c} ${c}`} />
      <text x="90" y="88" textAnchor="middle" className="fill-foreground font-display" fontSize="36" fontWeight="700">{value}</text>
    </svg>
  );
}

export function ScoreView({ score }: { score: S }) {
  const tips: string[] = [];
  if (!score.hasRecords) tips.push("Log your first harvest, expense, loss or stock movement to start your score.");
  else {
    if (score.parts.loss < 22) tips.push("Reduce losses: dry crops well, store off the ground and use pest control.");
    if (score.parts.completeness < 20) tips.push(`Record more often. You logged on ${score.activeDays} days this month; aim for 8.`);
    if (score.parts.grade < 15) tips.push("Grade your harvest (A, B, C) and sort out damaged produce.");
    if (score.parts.trace < 20) tips.push("Add Storage and Transfer stages to your batches so buyers can trace them.");
    if (!tips.length) tips.push("Excellent work! Keep recording to keep your score high.");
  }
  const facts = [
    ["Saved records used", score.recordCount.toLocaleString()],
    ["Harvest recorded", `${score.harvestedKg.toLocaleString()} kg`],
    ["Loss recorded", `${score.lostKg.toLocaleString()} kg`],
    ["Batches fully traced", `${score.tracedBatches} of ${score.batchCount}`],
    ["Active days (30 days)", `${score.activeDays} of 8`],
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Panel className="flex flex-col items-center justify-center text-center">
        <Gauge value={score.total} />
        <p className="mt-2 font-semibold">{!score.hasRecords ? "No records yet" : score.total >= 75 ? "Good" : score.total >= 50 ? "Fair" : "Needs work"}</p>
        <p className="mt-1 text-xs text-muted-foreground">Calculated from your saved AgTrack records</p>
      </Panel>
      <Panel title="What drives your score" className="lg:col-span-2">
        <div className="space-y-4">{(Object.keys(SCORE_WEIGHTS) as (keyof typeof SCORE_WEIGHTS)[]).map((key) => (
          <div key={key}><div className="flex justify-between text-sm"><span className="font-semibold">{labels[key][0]}</span><span>{score.parts[key].toFixed(1)} / {SCORE_WEIGHTS[key]}</span></div>
            <div className="mt-1 h-2.5 rounded-full bg-muted"><div className="h-2.5 rounded-full bg-brand" style={{ width: `${(score.parts[key] / SCORE_WEIGHTS[key]) * 100}%` }} /></div>
            <p className="mt-1 text-xs text-muted-foreground">{labels[key][1]}</p></div>))}</div>
      </Panel>
      <Panel title="Real data behind this score" className="lg:col-span-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{facts.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-muted p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-display text-xl font-bold">{value}</p></div>))}</div>
        {!score.hasRecords && <p className="mt-4 text-sm text-muted-foreground">There are no saved farm records yet, so the score is 0—not demo data.</p>}
      </Panel>
      <Panel title="How to improve" className="lg:col-span-3"><ul className="list-disc space-y-1 pl-5 text-sm">{tips.map((tip) => <li key={tip}>{tip}</li>)}</ul>
        <p className="mt-4 rounded-xl bg-muted p-3 text-xs text-muted-foreground"><b>Formula:</b> Score = Low losses (30) + Record keeping (25) + Harvest grade (20) + Traceability (25) = 100</p></Panel>
    </div>
  );
}

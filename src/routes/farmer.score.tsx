import { createFileRoute } from "@tanstack/react-router";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { PageHeader, Panel, Loading } from "@/components/agtrack/ui";
import { ScoreView } from "@/components/agtrack/ScoreView";
import { useFarmScore } from "@/hooks/use-score";
import { computeScore } from "@/lib/score";

export const Route = createFileRoute("/farmer/score")({ component: Score });
function Score() {
  const d = useFarmScore();
  const trend = [5, 4, 3, 2, 1, 0].map((m) => {
    const end = new Date(); end.setMonth(end.getMonth() - m); const iso = end.toISOString().slice(0, 10);
    const f = <T extends { date: string }>(a: T[]) => a.filter((x) => x.date <= iso);
    const s = computeScore({ harvests: f(d.harvests), losses: f(d.losses), traces: f(d.traces), recordDates: [...f(d.harvests), ...f(d.losses), ...f(d.expenses), ...f(d.inventory)].map((x) => x.date), now: end });
    return { m: end.toLocaleDateString("en-GB", { month: "short" }), score: s.total };
  });
  return (
    <>
      <PageHeader title="Quality Score" subtitle="A clear score from 0 to 100 for your farm" />
      {!d.score ? <Loading rows={4} /> : <div className="space-y-6"><ScoreView score={d.score} />
        <Panel title="Score over time"><div className="h-56"><ResponsiveContainer><LineChart data={trend}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="m" fontSize={12} /><YAxis domain={[0, 100]} fontSize={12} /><Tooltip /><Line dataKey="score" stroke="var(--chart-3)" strokeWidth={3} /></LineChart></ResponsiveContainer></div></Panel></div>}
    </>
  );
}

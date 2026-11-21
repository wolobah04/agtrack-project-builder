import { createFileRoute } from "@tanstack/react-router";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { PageHeader, Panel, Loading, Empty, ErrorState } from "@/components/agtrack/ui";
import { ScoreView } from "@/components/agtrack/ScoreView";
import { useFarmScore } from "@/hooks/use-score";
import { computeFarmScore } from "@/lib/score";

export const Route = createFileRoute("/farmer/score")({
  head: () => ({ meta: [
    { title: "My Quality Score — AgTrack" },
    { name: "description", content: "See your real AgTrack quality score calculated from saved harvests, losses, record activity, grades and traceability." },
    { property: "og:title", content: "My Quality Score — AgTrack" },
    { property: "og:description", content: "A transparent farm quality score calculated from your own saved AgTrack records." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: Score,
});

function Score() {
  const d = useFarmScore();
  const trend = [5, 4, 3, 2, 1, 0].map((monthsAgo) => {
    const end = new Date(); end.setMonth(end.getMonth() - monthsAgo);
    const iso = end.toISOString().slice(0, 10);
    const before = <T extends { date: string }>(rows: T[]) => rows.filter((row) => row.date <= iso);
    const score = computeFarmScore({
      harvests: before(d.harvests), losses: before(d.losses), traces: before(d.traces),
      expenses: before(d.expenses), inventory: before(d.inventory),
    }, end);
    return { month: end.toLocaleDateString("en-GB", { month: "short" }), score: score.total };
  });
  return (
    <>
      <PageHeader title="Quality Score" subtitle="Calculated from your saved harvests, losses, activity, grades and trace stages" />
      {d.loading ? <Loading rows={4} /> : d.error ? <ErrorState text="Could not load all the records needed for your score. Please try again." /> : d.score ? (
        <div className="space-y-6"><ScoreView score={d.score} />
          <Panel title="Score over time" >{d.score.hasRecords ? <div className="h-56"><ResponsiveContainer><LineChart data={trend}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="month" fontSize={12} /><YAxis domain={[0, 100]} fontSize={12} /><Tooltip /><Line dataKey="score" stroke="var(--chart-3)" strokeWidth={3} /></LineChart></ResponsiveContainer></div> : <Empty text="Your score trend will appear after you save farm records." />}</Panel>
        </div>
      ) : null}
    </>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, Tractor, Wheat, TrendingDown, Award } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { PageHeader, Panel, StatCard, Loading } from "@/components/agtrack/ui";
import { api } from "@/lib/api";
import { COUNTY_NAMES } from "@/lib/constants";
import { computeFarmScore } from "@/lib/score";

export const Route = createFileRoute("/admin/")({ component: Dash });
export function useNational() {
  return useQuery({ queryKey: ["national"], queryFn: api.national, select: (d) => {
    const farmers = d.users.filter((u) => u.role === "farmer");
    const scores = farmers.map((f) => { const own = <T extends { farmer_id: string }>(a: T[]) => a.filter((x) => x.farmer_id === f.id);
      return computeFarmScore({ harvests: own(d.harvests), losses: own(d.losses), traces: own(d.traces), expenses: own(d.expenses), inventory: own(d.inventory) }).total; });
    const county = (c: string) => d.users.filter((u) => u.county === c).map((u) => u.id);
    const byCounty = COUNTY_NAMES.map((c) => { const ids = county(c); return { county: c, farmers: farmers.filter((f) => f.county === c).length, harvest: d.harvests.filter((h) => ids.includes(h.farmer_id)).reduce((s, h) => s + h.quantity_kg, 0), losses: d.losses.filter((l) => ids.includes(l.farmer_id)).reduce((s, l) => s + l.quantity_kg, 0) }; });
    const byCrop = Object.entries(d.harvests.reduce<Record<string, number>>((a, h) => ({ ...a, [h.crop]: (a[h.crop] ?? 0) + h.quantity_kg }), {})).map(([crop, kg]) => ({ crop, kg }));
    return { farmers: farmers.length, agents: d.users.filter((u) => u.role === "agent").length, harvest: d.harvests.reduce((s, h) => s + h.quantity_kg, 0), losses: d.losses.reduce((s, l) => s + l.quantity_kg, 0), avgScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0, byCounty, byCrop };
  } });
}
function Dash() {
  const q = useNational(); const d = q.data;
  const max = Math.max(1, ...(d?.byCounty.map((c) => c.harvest) ?? [1]));
  return (
    <>
      <PageHeader title="National Dashboard" subtitle="Ministry of Agriculture · all counties" />
      {!d ? <Loading rows={5} /> : <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <StatCard icon={Users} label="Farmers" value={d.farmers} /><StatCard icon={Tractor} label="Field agents" value={d.agents} />
          <StatCard icon={Wheat} label="Total harvest" value={`${(d.harvest / 1000).toFixed(1)} t`} /><StatCard icon={TrendingDown} label="Total losses" value={`${(d.losses / 1000).toFixed(2)} t`} />
          <StatCard icon={Award} label="Avg. quality" value={d.avgScore} hint="out of 100" accent />
        </div>
        <Panel title="Harvest and losses by county (kg)"><div className="h-80"><ResponsiveContainer><BarChart data={d.byCounty.filter((c) => c.harvest)}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="county" fontSize={11} interval={0} angle={-30} textAnchor="end" height={60} /><YAxis fontSize={12} /><Tooltip /><Legend /><Bar dataKey="harvest" fill="var(--chart-3)" radius={[6, 6, 0, 0]} /><Bar dataKey="losses" fill="var(--chart-4)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></Panel>
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="County heat view (harvest)"><div className="grid grid-cols-3 gap-2 sm:grid-cols-5">{d.byCounty.map((c) => (
            <div key={c.county} className="rounded-xl p-2 text-center text-xs font-semibold" style={{ background: `color-mix(in oklab, var(--leaf) ${10 + (c.harvest / max) * 80}%, var(--muted))` }}><p className="truncate">{c.county}</p><p className="opacity-80">{c.farmers} farmers</p></div>))}</div></Panel>
          <Panel title="Harvest by crop (kg)"><div className="h-64"><ResponsiveContainer><BarChart data={d.byCrop} layout="vertical"><XAxis type="number" fontSize={12} /><YAxis type="category" dataKey="crop" fontSize={12} width={70} /><Tooltip /><Bar dataKey="kg" fill="var(--chart-1)" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></div></Panel>
        </div>
      </div>}
    </>
  );
}

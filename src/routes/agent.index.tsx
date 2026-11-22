import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, UserPlus, ClipboardEdit, Users, Wheat, FileText, Award, CloudSun, Droplets, BadgeCheck, Clock3 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader, Panel, StatCard, Loading, Empty, ErrorState } from "@/components/agtrack/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAgentCohort } from "@/hooks/use-agent-cohort";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/constants";
import { describe, farmTips, getForecast } from "@/lib/weather";

export const Route = createFileRoute("/agent/")({
  head: () => ({ meta: [
    { title: "Field Operations — AgTrack Agent" },
    { name: "description", content: "Field agent overview of registered farmers, harvests, records, quality scores, local weather and Ministry verification." },
    { property: "og:title", content: "Field Operations — AgTrack Agent" },
    { property: "og:description", content: "Track your farmers' harvests, records, quality scores and Ministry verification in one place." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  component: AgentOverview,
});

function AgentOverview() {
  const { session: s, summaries, loading, error } = useAgentCohort();
  const profile = useQuery({ queryKey: ["profile"], queryFn: api.auth.me, enabled: !!s });
  const [q, setQ] = useState(""); const [county, setCounty] = useState("all");
  const wx = useQuery({ queryKey: ["wx", s?.user.county], queryFn: () => getForecast(s!.user.county), enabled: !!s, staleTime: 30 * 60e3 });
  const totalKg = summaries.reduce((t, f) => t + f.harvests.reduce((a, h) => a + h.quantity_kg, 0), 0);
  const scored = summaries.filter((f) => f.score !== null);
  const avg = scored.length ? Math.round(scored.reduce((t, f) => t + f.score!, 0) / scored.length) : 0;
  const months = Object.values(summaries.flatMap((f) => f.harvests).reduce<Record<string, { k: string; m: string; kg: number }>>((acc, h) => {
    const k = h.date.slice(0, 7); acc[k] ??= { k, m: new Date(h.date).toLocaleDateString("en-GB", { month: "short", year: "2-digit" }), kg: 0 }; acc[k].kg += h.quantity_kg; return acc;
  }, {})).sort((a, b) => a.k.localeCompare(b.k)).slice(-6);
  const counties = [...new Set(summaries.map((f) => f.farmer.county))].sort();
  const list = summaries.filter((f) => (county === "all" || f.farmer.county === county) && (f.farmer.name + f.farmer.phone + f.farmer.county).toLowerCase().includes(q.toLowerCase()));
  const today = wx.data?.daily[0];
  return (
    <>
      <PageHeader title="Field Operations" subtitle={`${s?.user.county ?? ""} County · farmers you support`} action={<div className="flex flex-wrap items-center justify-end gap-2">
        {profile.data && <Badge variant={profile.data.verified ? "default" : "secondary"} className="gap-1.5 px-3 py-2">
          {profile.data.verified ? <BadgeCheck className="size-4" /> : <Clock3 className="size-4" />}
          {profile.data.verified ? "Ministry Verified" : "Pending Ministry Verification"}
        </Badge>}
        <Button asChild variant="hero"><Link to="/agent/register"><UserPlus />Register</Link></Button>
      </div>} />
      {error ? <ErrorState text="Could not load all your farmers' records. Please try again." /> : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon={Users} label="Total farmers" value={loading ? "…" : summaries.length} />
            <StatCard icon={Wheat} label="Harvest logged" value={loading ? "…" : `${totalKg.toLocaleString()} kg`} />
            <StatCard icon={FileText} label="Field records" value={loading ? "…" : summaries.reduce((t, f) => t + f.records, 0)} />
            <StatCard icon={Award} label="Avg. quality score" value={loading ? "…" : avg} hint="out of 100" accent />
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <Panel title="Monthly harvest (kg)" className="lg:col-span-2">
              {loading ? <Loading rows={3} /> : months.length ? <div className="h-64"><ResponsiveContainer><BarChart data={months}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="m" fontSize={12} /><YAxis fontSize={12} /><Tooltip /><Bar dataKey="kg" fill="var(--chart-3)" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></div> : <Empty text="No harvests logged by your farmers yet." />}
            </Panel>
            <Panel title={`Weather · ${s?.user.county ?? ""}`}>
              {wx.isLoading ? <Loading rows={2} /> : wx.data && today ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-4"><CloudSun className="size-12 text-primary" /><div><p className="font-display text-4xl font-bold">{Math.round(wx.data.current.temperature)}°C</p><p className="text-sm text-muted-foreground">{describe(wx.data.current.code)}</p></div></div>
                  <p className="flex items-center gap-2 text-sm"><Droplets className="size-4 text-primary" />Rain risk today: <b>{today.rainChance}%</b> · {today.rain} mm</p>
                  <p className="rounded-xl bg-secondary p-3 text-sm">{farmTips(wx.data)[0]}</p>
                </div>
              ) : <p className="text-sm text-muted-foreground">Weather is not available right now.</p>}
            </Panel>
          </div>
          <Panel title="Farmer directory">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1"><Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, phone or county" className="h-11 pl-9" /></div>
              <Select value={county} onValueChange={setCounty}><SelectTrigger className="h-11 sm:w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All counties</SelectItem>{counties.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
            {loading ? <Loading /> : !list.length ? <Empty text={summaries.length ? "No farmers match your search." : "No farmers yet. Register your first farmer."} /> : (
              <ul className="divide-y divide-border">{list.map((f) => (
                <li key={f.farmer.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1"><p className="font-bold">{f.farmer.name}</p><p className="text-sm text-muted-foreground">{f.farmer.phone} · {f.farmer.county}</p>
                    <div className="mt-1 flex flex-wrap gap-2"><Badge variant="secondary">{f.crop}</Badge><Badge variant="outline">Since {fmtDate(f.farmer.created_at)}</Badge><Badge>Score {f.score ?? "–"}/100</Badge></div></div>
                  <Button asChild size="lg" variant="outline"><Link to="/agent/record" search={{ farmer: f.farmer.id }}><ClipboardEdit />Record</Link></Button>
                </li>))}</ul>
            )}
          </Panel>
        </div>
      )}
    </>
  );
}

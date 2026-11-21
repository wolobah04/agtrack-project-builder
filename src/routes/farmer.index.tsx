import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Wheat, Wallet, TrendingDown, Award, Plus, CloudSun, QrCode } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader, Panel, StatCard, Loading, Empty } from "@/components/agtrack/ui";
import { FormDialog, useDialog } from "@/components/agtrack/FormDialog";
import { Button } from "@/components/ui/button";
import { useFarmScore } from "@/hooks/use-score";
import { useInvalidate } from "@/hooks/use-farm-data";
import { useSession } from "@/hooks/use-session";
import { api } from "@/lib/api";
import { fmtDate, fmtLRD } from "@/lib/constants";
import { harvestFields, d0, toHarvest } from "@/lib/forms";
import { getForecast, describe } from "@/lib/weather";

export const Route = createFileRoute("/farmer/")({ component: Overview });

function Overview() {
  const s = useSession(); const inv = useInvalidate(); const dlg = useDialog();
  const { score, loading, harvests, expenses, losses, traces } = useFarmScore();
  const wx = useQuery({ queryKey: ["wx", s?.user.county], queryFn: () => getForecast(s!.user.county), enabled: !!s, staleTime: 30 * 60e3 });
  const sum = (a: { [k: string]: any }[], k: string) => a.reduce((t, x) => t + x[k], 0);
  const byMonth = Object.values(harvests.reduce<Record<string, { m: string; kg: number }>>((acc, h) => { const m = h.date.slice(0, 7); acc[m] ??= { m: new Date(h.date).toLocaleDateString("en-GB", { month: "short" }), kg: 0 }; acc[m].kg += h.quantity_kg; return acc; }, {})).reverse();
  const activity = [...harvests.map((h) => ({ d: h.date, t: `Harvest: ${h.quantity_kg} kg ${h.crop}`, k: h.id })), ...expenses.map((e) => ({ d: e.date, t: `Expense: ${e.category} ${fmtLRD(e.amount)}`, k: e.id })), ...losses.map((l) => ({ d: l.date, t: `Loss: ${l.quantity_kg} kg ${l.crop} (${l.cause})`, k: l.id }))].sort((a, b) => b.d.localeCompare(a.d)).slice(0, 6);
  return (
    <>
      <PageHeader title="Overview" subtitle={`${s?.user.farm_type ?? ""} farm · ${s?.user.county ?? ""} County`} action={<Button variant="hero" onClick={() => dlg.show()}><Plus />Log harvest</Button>} />
      {loading ? <Loading rows={4} /> : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon={Wheat} label="Total harvest" value={`${sum(harvests, "quantity_kg").toLocaleString()} kg`} hint={`${harvests.length} batches`} />
            <StatCard icon={Wallet} label="Expenses" value={fmtLRD(sum(expenses, "amount"))} />
            <StatCard icon={TrendingDown} label="Losses" value={`${sum(losses, "quantity_kg")} kg`} hint={`${Math.round((score?.lossRate ?? 0) * 100)}% loss rate`} />
            <StatCard icon={Award} label="Quality score" value={score?.total ?? 0} hint="out of 100" accent />
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <Panel title="Harvest by month (kg)" className="lg:col-span-2">
              {byMonth.length ? <div className="h-64"><ResponsiveContainer><BarChart data={byMonth}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="m" fontSize={12} /><YAxis fontSize={12} /><Tooltip /><Bar dataKey="kg" fill="var(--chart-3)" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></div> : <Empty text="No harvests yet." />}
            </Panel>
            <Panel title="Weather today" action={<Link to="/farmer/weather" className="text-sm font-semibold text-primary">7 days</Link>}>
              {wx.isLoading ? <Loading rows={2} /> : wx.data ? (
                <div className="flex items-center gap-4"><CloudSun className="size-12 text-primary" /><div><p className="font-display text-4xl font-bold">{Math.round(wx.data.current.temperature)}°C</p><p className="text-sm text-muted-foreground">{describe(wx.data.current.code)} · {wx.data.current.humidity}% humidity</p></div></div>
              ) : <p className="text-sm text-muted-foreground">Weather is not available right now.</p>}
            </Panel>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Recent activity">{activity.length ? <ul className="divide-y divide-border">{activity.map((a) => <li key={a.k} className="flex justify-between gap-3 py-3 text-sm"><span>{a.t}</span><span className="shrink-0 text-muted-foreground">{fmtDate(a.d)}</span></li>)}</ul> : <Empty text="Nothing recorded yet." />}</Panel>
            <Panel title="My batches">{harvests.length ? <ul className="divide-y divide-border">{harvests.slice(0, 6).map((h) => { const n = traces.filter((t) => t.batch_code === h.batch_code).length; return (
              <li key={h.id} className="flex items-center justify-between gap-3 py-3 text-sm"><Link to="/trace/$code" params={{ code: h.batch_code }} className="flex items-center gap-2 font-semibold text-primary"><QrCode className="size-4" />{h.batch_code}</Link><span className="text-muted-foreground">{h.crop} · {n} stage{n === 1 ? "" : "s"}</span></li>); })}</ul> : <Empty text="Log a harvest to create your first batch." />}</Panel>
          </div>
        </div>
      )}
      <FormDialog open={dlg.open} onOpenChange={dlg.setOpen} title="Log harvest" fields={harvestFields} initial={{ ...d0(), location: `${s?.user.county ?? ""} County` }}
        onSubmit={async (v) => { await api.harvests.createWithBatch(toHarvest(v)); inv("harvests", "traces"); }} />
    </>
  );
}

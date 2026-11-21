import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileText, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel, Empty, Loading } from "@/components/agtrack/ui";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInvalidate, useRecords } from "@/hooks/use-farm-data";
import { useSession } from "@/hooks/use-session";
import { api } from "@/lib/api";
import { fmtDate, fmtLRD } from "@/lib/constants";
import type { FarmReport } from "@/lib/types";

export const Route = createFileRoute("/farmer/reports")({ component: Reports });
const periods = ["This month", "Last 3 months", "This season", "This year"];
function Reports() {
  const q = useRecords("reports"); const inv = useInvalidate(); const s = useSession();
  const [period, setPeriod] = useState(periods[0]!); const [busy, setBusy] = useState(false); const [view, setView] = useState<FarmReport | null>(null);
  const gen = async () => { setBusy(true); try { const r = await api.reports.generate(period); inv("reports"); setView(r); toast.success("Report ready"); } catch (x) { toast.error((x as Error).message); } finally { setBusy(false); } };
  const cur = view ?? q.data?.[0];
  return (
    <>
      <PageHeader title="Reports" subtitle="Make a simple farm report to print or save as PDF" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 print:hidden">
          <Panel title="New report"><div className="space-y-3">
            <Select value={period} onValueChange={setPeriod}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent>{periods.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
            <Button variant="hero" className="w-full" onClick={gen} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <FileText />}Generate report</Button></div></Panel>
          <Panel title="Past reports">{q.isLoading ? <Loading /> : q.data?.length ? <ul className="space-y-1">{q.data.map((r) => <li key={r.id}><button onClick={() => setView(r)} className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"><b>{r.period}</b><span className="block text-xs text-muted-foreground">{fmtDate(r.created_at)}</span></button></li>)}</ul> : <Empty text="No reports yet." />}</Panel>
        </div>
        <Panel className="lg:col-span-2" title={cur?.title ?? "Report preview"} action={cur ? <Button variant="outline" size="sm" className="print:hidden" onClick={() => window.print()}><Printer />Print / PDF</Button> : undefined}>
          {cur ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{s?.user.name} · {s?.user.county} County · {s?.user.farm_type} · Made {fmtDate(cur.created_at)}</p>
              <div className="grid grid-cols-2 gap-3">
                {[["Total harvest", `${cur.summary["harvest_kg"]?.toLocaleString()} kg`], ["Batches", cur.summary["batches"]], ["Expenses", fmtLRD(cur.summary["expenses_lrd"] ?? 0)], ["Losses", `${cur.summary["losses_kg"]} kg`]].map(([k, v]) => <div key={k as string} className="rounded-xl bg-muted p-4"><p className="text-xs text-muted-foreground">{k}</p><p className="font-display text-2xl font-bold">{v}</p></div>)}
              </div>
            </div>) : <Empty text="Generate a report to see it here." />}
        </Panel>
      </div>
    </>
  );
}

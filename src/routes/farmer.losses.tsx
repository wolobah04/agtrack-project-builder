import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { PageHeader, Panel, Empty } from "@/components/agtrack/ui";
import { RecordTable } from "@/components/agtrack/RecordTable";
import { FormDialog, useDialog } from "@/components/agtrack/FormDialog";
import { Button } from "@/components/ui/button";
import { useInvalidate, useRecords } from "@/hooks/use-farm-data";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/constants";
import { d0, lossFields, toLoss } from "@/lib/forms";

export const Route = createFileRoute("/farmer/losses")({ component: Losses });
const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
function Losses() {
  const q = useRecords("losses"); const inv = useInvalidate(); const dlg = useDialog();
  const byCause = Object.entries((q.data ?? []).reduce<Record<string, number>>((a, l) => ({ ...a, [l.cause]: (a[l.cause] ?? 0) + l.quantity_kg }), {})).map(([name, value]) => ({ name, value }));
  return (
    <>
      <PageHeader title="Loss Record" subtitle="Log losses in the field and after harvest" action={<Button variant="hero" onClick={() => dlg.show()}><Plus />Log loss</Button>} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Losses by cause (kg)">
          {byCause.length ? <><div className="h-48"><ResponsiveContainer><PieChart><Pie data={byCause} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>{byCause.map((_, i) => <Cell key={i} fill={colors[i % 5]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
            <ul className="mt-3 space-y-1 text-sm">{byCause.map((c, i) => <li key={c.name} className="flex items-center gap-2"><span className="size-3 rounded-full" style={{ background: colors[i % 5] }} />{c.name}<span className="ml-auto font-semibold">{c.value} kg</span></li>)}</ul></> : <Empty text="No losses recorded." />}
        </Panel>
        <Panel title="All losses" className="lg:col-span-2">
          <RecordTable rows={q.data} loading={q.isLoading} error={q.isError} empty="No losses recorded. Great!" cols={[
            { h: "Date", c: (r) => fmtDate(r.date) }, { h: "Crop", c: (r) => r.crop }, { h: "Cause", c: (r) => r.cause }, { h: "Quantity", c: (r) => `${r.quantity_kg} kg`, right: true },
            { h: "", right: true, c: (r) => <Button size="icon" variant="ghost" aria-label="Delete" onClick={async () => { if (confirm("Delete this record?")) { await api.losses.remove(r.id); inv("losses"); } }}><Trash2 /></Button> }]} />
        </Panel>
      </div>
      <FormDialog open={dlg.open} onOpenChange={dlg.setOpen} title="Log loss" fields={lossFields} initial={d0()} onSubmit={async (v) => { await api.losses.create(toLoss(v)); inv("losses"); }} />
    </>
  );
}

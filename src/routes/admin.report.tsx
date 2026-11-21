import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Printer } from "lucide-react";
import { PageHeader, Panel, Loading } from "@/components/agtrack/ui";
import { RecordTable } from "@/components/agtrack/RecordTable";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNational } from "./admin.index";
import { COUNTY_NAMES } from "@/lib/constants";

export const Route = createFileRoute("/admin/report")({ component: Rep });
function Rep() {
  const q = useNational(); const [c, setC] = useState("All");
  const rows = (q.data?.byCounty ?? []).filter((r) => c === "All" || r.county === c).map((r) => ({ ...r, id: r.county, rate: r.harvest + r.losses ? Math.round((r.losses / (r.harvest + r.losses)) * 100) : 0 }));
  const csv = () => { const s = "County,Farmers,Harvest kg,Losses kg,Loss %\n" + rows.map((r) => [r.county, r.farmers, r.harvest, r.losses, r.rate].join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([s], { type: "text/csv" })); a.download = "agtrack-county-report.csv"; a.click(); };
  return (
    <>
      <PageHeader title="National Report" subtitle="County-level figures" action={<div className="flex gap-2 print:hidden"><Button variant="outline" onClick={csv}><Download />CSV</Button><Button variant="outline" onClick={() => print()}><Printer />Print</Button></div>} />
      <Panel title="Filter" className="mb-6 print:hidden"><Select value={c} onValueChange={setC}><SelectTrigger className="h-11 max-w-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="All">All counties</SelectItem>{COUNTY_NAMES.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></Panel>
      <Panel>{q.isLoading ? <Loading /> : <RecordTable rows={rows} empty="No data." cols={[{ h: "County", c: (r) => <b>{r.county}</b> }, { h: "Farmers", c: (r) => r.farmers, right: true }, { h: "Harvest (kg)", c: (r) => r.harvest.toLocaleString(), right: true }, { h: "Losses (kg)", c: (r) => r.losses.toLocaleString(), right: true }, { h: "Loss rate", c: (r) => `${r.rate}%`, right: true }]} />}</Panel>
    </>
  );
}

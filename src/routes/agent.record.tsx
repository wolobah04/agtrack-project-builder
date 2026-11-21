import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Wheat, Wallet, TrendingDown, Boxes, MapPin, Sprout, CloudOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRecords, useInvalidate } from "@/hooks/use-farm-data";
import { flushQueue, getQueue } from "@/lib/offline";
import { useOnline } from "./agent";
import { fmtDate } from "@/lib/constants";
import { toast } from "sonner";
import { PageHeader, Panel, Empty } from "@/components/agtrack/ui";
import { FormDialog, type Field } from "@/components/agtrack/FormDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from "@/hooks/use-session";
import { api } from "@/lib/api";
import { enqueue, send, type QueuedItem } from "@/lib/offline";
import { d0, expenseFields, harvestFields, lossFields, stockFields, toExpense, toHarvest, toLoss, toStock } from "@/lib/forms";

export const Route = createFileRoute("/agent/record")({
  validateSearch: (s: Record<string, unknown>) => ({ farmer: typeof s["farmer"] === "string" ? s["farmer"] : undefined }),
  head: () => ({ meta: [{ title: "Record Field Data — AgTrack Agent" }, { name: "description", content: "Record harvests, expenses, losses and stock for your farmers, even offline." }, { property: "og:title", content: "Record Field Data — AgTrack Agent" }, { property: "og:description", content: "Offline-ready field recording for AgTrack agents." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: Record_,
});
const kinds: { k: QueuedItem["kind"]; label: string; icon: typeof Wheat; fields: Field[]; map: (v: Record<string, string>) => object }[] = [
  { k: "harvest", label: "Harvest", icon: Wheat, fields: harvestFields, map: toHarvest }, { k: "expense", label: "Expense", icon: Wallet, fields: expenseFields, map: toExpense },
  { k: "loss", label: "Crop Loss", icon: TrendingDown, fields: lossFields, map: toLoss }, { k: "inventory", label: "Stock", icon: Boxes, fields: stockFields, map: toStock }];
function Record_() {
  const s = useSession(); const search = Route.useSearch(); const [farmer, setFarmer] = useState(search.farmer ?? ""); const [open, setOpen] = useState<QueuedItem["kind"] | null>(null);
  const users = useQuery({ queryKey: ["users"], queryFn: api.users.list });
  const mine = (users.data ?? []).filter((u) => u.role === "farmer" && u.agent_id === s?.user.id);
  const f = mine.find((u) => u.id === farmer); const kind = kinds.find((x) => x.k === open);
  const inv = useInvalidate();
  const hv = useRecords("harvests", f?.id); const latest = [...(f ? hv.data ?? [] : [])].sort((a, b) => b.date.localeCompare(a.date))[0];
  return (
    <>
      <PageHeader title="Record Data" subtitle="Record on behalf of a farmer. Works offline: records are saved and sent later." />
      <Panel title="1. Choose farmer" className="mb-6">
        <Select value={farmer} onValueChange={setFarmer}><SelectTrigger className="h-12 max-w-md"><SelectValue placeholder="Choose a farmer" /></SelectTrigger><SelectContent>{mine.map((u) => <SelectItem key={u.id} value={u.id}>{u.name} · {u.county}</SelectItem>)}</SelectContent></Select>
      </Panel>
      {f && <Panel title="Farmer profile" className="mb-6"><div className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3"><Sprout className="size-5 text-primary" /><div><p className="text-xs text-muted-foreground">Active crop</p><p className="font-bold">{latest?.crop ?? f.farm_type}</p></div></div>
        <div className="flex items-center gap-3"><MapPin className="size-5 text-primary" /><div><p className="text-xs text-muted-foreground">Location</p><p className="font-bold">{latest?.location || `${f.county} County`}</p></div></div>
        <div className="flex items-center gap-3"><Wheat className="size-5 text-primary" /><div><p className="text-xs text-muted-foreground">Latest harvest</p><p className="font-bold">{hv.isLoading ? "Loading…" : latest ? `${latest.quantity_kg} kg · ${fmtDate(latest.date)}` : "None yet"}</p></div></div>
      </div></Panel>}
      <SyncPanel />
      <Panel title="2. What do you want to record?">
        {!f ? <Empty text="Choose a farmer first." /> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{kinds.map((k) => (
          <button key={k.k} onClick={() => setOpen(k.k)} className="flex flex-col items-center gap-3 min-h-32 rounded-2xl border-2 border-border p-6 text-lg font-bold transition-colors hover:border-leaf hover:bg-secondary"><span className="grid size-12 place-items-center rounded-xl bg-brand text-accent-foreground"><k.icon /></span>{k.label}</button>))}</div>}
      </Panel>
      {kind && f && <FormDialog open={!!open} onOpenChange={(o) => !o && setOpen(null)} title={`${kind.label} for ${f.name}`} fields={kind.fields} initial={{ ...d0(), type: "in", unit: "kg", location: `${f.county} County` }}
        onSubmit={async (v) => { const payload = { ...kind.map(v), farmer_id: f.id };
          if (!navigator.onLine) { enqueue({ kind: kind.k, payload, label: kind.label }); toast.info("You are offline. Saved, will sync later."); return; }
          try { await send(kind.k, payload); inv("harvests", "expenses", "losses", "inventory", "traces"); toast.success(`${kind.label} saved`); } catch { enqueue({ kind: kind.k, payload, label: kind.label }); toast.info("Could not send. Saved for later sync."); } }} />}
    </>
  );
}

function SyncPanel() {
  const online = useOnline(); const [n, setN] = useState(0); const [busy, setBusy] = useState(false);
  useEffect(() => { const f = () => setN(getQueue().length); f(); addEventListener("agtrack-queue", f); return () => removeEventListener("agtrack-queue", f); }, []);
  return (
    <div className={`mb-6 flex flex-wrap items-center gap-3 rounded-2xl border p-4 ${n ? "border-destructive/40 bg-destructive/10" : "border-border bg-secondary"}`}>
      {n ? <CloudOff className="size-5 text-destructive" /> : <CheckCircle2 className="size-5 text-primary" />}
      <p className="flex-1 text-sm font-semibold">{n ? `${n} record(s) saved on this device, waiting to sync${online ? "" : " · you are offline"}` : online ? "All records are synced." : "You are offline. New records will be saved on this device."}</p>
      {n > 0 && <Button disabled={!online || busy} onClick={async () => { setBusy(true); const k = await flushQueue(); setBusy(false); toast.success(`Synced ${k} record(s)`); }}><RefreshCw className={busy ? "animate-spin" : ""} />Sync now</Button>}
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Wheat, Wallet, TrendingDown, Boxes } from "lucide-react";
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
  component: Record_,
});
const kinds: { k: QueuedItem["kind"]; label: string; icon: typeof Wheat; fields: Field[]; map: (v: Record<string, string>) => object }[] = [
  { k: "harvest", label: "Harvest", icon: Wheat, fields: harvestFields, map: toHarvest }, { k: "expense", label: "Expense", icon: Wallet, fields: expenseFields, map: toExpense },
  { k: "loss", label: "Loss", icon: TrendingDown, fields: lossFields, map: toLoss }, { k: "inventory", label: "Stock", icon: Boxes, fields: stockFields, map: toStock }];
function Record_() {
  const s = useSession(); const search = Route.useSearch(); const [farmer, setFarmer] = useState(search.farmer ?? ""); const [open, setOpen] = useState<QueuedItem["kind"] | null>(null);
  const users = useQuery({ queryKey: ["users"], queryFn: api.users.list });
  const mine = (users.data ?? []).filter((u) => u.role === "farmer" && u.agent_id === s?.user.id);
  const f = mine.find((u) => u.id === farmer); const kind = kinds.find((x) => x.k === open);
  return (
    <>
      <PageHeader title="Record Data" subtitle="Record on behalf of a farmer. Works offline: records are saved and sent later." />
      <Panel title="1. Choose farmer" className="mb-6">
        <Select value={farmer} onValueChange={setFarmer}><SelectTrigger className="h-12 max-w-md"><SelectValue placeholder="Choose a farmer" /></SelectTrigger><SelectContent>{mine.map((u) => <SelectItem key={u.id} value={u.id}>{u.name} · {u.county}</SelectItem>)}</SelectContent></Select>
      </Panel>
      <Panel title="2. What do you want to record?">
        {!f ? <Empty text="Choose a farmer first." /> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{kinds.map((k) => (
          <button key={k.k} onClick={() => setOpen(k.k)} className="flex flex-col items-center gap-3 rounded-2xl border-2 border-border p-6 font-bold transition-colors hover:border-leaf hover:bg-secondary"><span className="grid size-12 place-items-center rounded-xl bg-brand text-accent-foreground"><k.icon /></span>{k.label}</button>))}</div>}
      </Panel>
      {kind && f && <FormDialog open={!!open} onOpenChange={(o) => !o && setOpen(null)} title={`${kind.label} for ${f.name}`} fields={kind.fields} initial={{ ...d0(), type: "in", unit: "kg", location: `${f.county} County` }}
        onSubmit={async (v) => { const payload = { ...kind.map(v), farmer_id: f.id };
          if (!navigator.onLine) { enqueue({ kind: kind.k, payload, label: kind.label }); toast.info("You are offline. Saved, will sync later."); return; }
          try { await send(kind.k, payload); } catch { enqueue({ kind: kind.k, payload, label: kind.label }); toast.info("Could not send. Saved for later sync."); } }} />}
    </>
  );
}

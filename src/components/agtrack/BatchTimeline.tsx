import { Package, Warehouse, Truck, Store } from "lucide-react";
import { fmtDate } from "@/lib/constants";
import type { Trace } from "@/lib/types";
const icons = { Harvest: Package, Storage: Warehouse, Transfer: Truck, Sale: Store };
export function BatchTimeline({ stages }: { stages: Pick<Trace, "id" | "stage" | "location" | "actor" | "date">[] }) {
  return (
    <ol className="relative space-y-5 border-l-2 border-accent pl-6">
      {stages.map((s) => { const I = icons[s.stage]; return (
        <li key={s.id} className="relative">
          <span className="absolute -left-[37px] grid size-8 place-items-center rounded-full bg-brand text-accent-foreground"><I className="size-4" /></span>
          <p className="font-bold">{s.stage}</p>
          <p className="text-sm text-muted-foreground">{fmtDate(s.date)} · {s.location} · {s.actor}</p>
        </li>); })}
    </ol>
  );
}

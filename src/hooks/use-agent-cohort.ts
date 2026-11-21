import { useQueries, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { computeFarmScore } from "@/lib/score";
import type { Expense, Harvest, InventoryTx, LossRecord, Trace, User } from "@/lib/types";
import { useSession } from "./use-session";

const RES = ["harvests", "expenses", "losses", "inventory", "traces"] as const;
export interface FarmerSummary { farmer: User; harvests: Harvest[]; records: number; score: number | null; crop: string; latest: Harvest | null }

/** Loads the agent's farmers and each farmer's real records (same query keys as the farmer pages). */
export function useAgentCohort() {
  const s = useSession();
  const users = useQuery({ queryKey: ["users"], queryFn: api.users.list, enabled: !!s });
  const farmers = (users.data ?? []).filter((u) => u.role === "farmer" && u.agent_id === s?.user.id);
  const qs = useQueries({
    queries: farmers.flatMap((f) => RES.map((r) => ({ queryKey: [r, f.id], queryFn: () => (api[r].list as (id?: string) => Promise<unknown[]>)(f.id) }))),
  });
  const summaries: FarmerSummary[] = farmers.map((farmer, i) => {
    const [h, e, l, inv, t] = RES.map((_, j) => qs[i * RES.length + j]);
    const ok = [h, e, l, inv, t].every((q) => q?.isSuccess);
    const harvests = (h?.data ?? []) as Harvest[];
    const rec = { harvests, expenses: (e?.data ?? []) as Expense[], losses: (l?.data ?? []) as LossRecord[], inventory: (inv?.data ?? []) as InventoryTx[], traces: (t?.data ?? []) as Trace[] };
    const sorted = [...harvests].sort((a, b) => b.date.localeCompare(a.date));
    return {
      farmer, harvests,
      records: harvests.length + rec.expenses.length + rec.losses.length + rec.inventory.length + rec.traces.length,
      score: ok ? computeFarmScore(rec).total : null,
      crop: sorted[0]?.crop ?? farmer.farm_type, latest: sorted[0] ?? null,
    };
  });
  return { session: s, summaries, loading: users.isLoading || qs.some((q) => q.isLoading), error: users.isError || qs.some((q) => q.isError) };
}

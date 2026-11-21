import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
type Res = "harvests" | "expenses" | "losses" | "inventory" | "traces" | "reports";
import type { Expense, FarmReport, Harvest, InventoryTx, LossRecord, Trace } from "@/lib/types";
type Rows = { harvests: Harvest; expenses: Expense; losses: LossRecord; inventory: InventoryTx; traces: Trace; reports: FarmReport };
export function useRecords<R extends Res>(res: R, farmerId?: string) {
  return useQuery<Rows[R][]>({ queryKey: [res, farmerId ?? "me"], queryFn: () => (api[res].list as (id?: string) => Promise<Rows[R][]>)(farmerId) });
}
export function useInvalidate() { const qc = useQueryClient(); return (...keys: string[]) => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] })); }
export { useMutation };

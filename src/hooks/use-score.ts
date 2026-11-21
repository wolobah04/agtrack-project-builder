import { useRecords } from "./use-farm-data";
import { computeFarmScore } from "@/lib/score";

export function useFarmScore(farmerId?: string) {
  const h = useRecords("harvests", farmerId);
  const l = useRecords("losses", farmerId);
  const t = useRecords("traces", farmerId);
  const e = useRecords("expenses", farmerId);
  const i = useRecords("inventory", farmerId);
  const queries = [h, l, t, e, i];
  const loading = queries.some((query) => query.isLoading);
  const error = queries.some((query) => query.isError);
  const ready = queries.every((query) => query.isSuccess);
  const records = {
    harvests: h.data ?? [],
    losses: l.data ?? [],
    traces: t.data ?? [],
    expenses: e.data ?? [],
    inventory: i.data ?? [],
  };
  // Never calculate from a partial or failed load: that would look like real farm data.
  const score = ready && !error ? computeFarmScore(records) : null;
  return { score, loading, error, ...records };
}

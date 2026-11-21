import { useRecords } from "./use-farm-data";
import { computeScore } from "@/lib/score";
export function useFarmScore(farmerId?: string) {
  const h = useRecords("harvests", farmerId), l = useRecords("losses", farmerId), t = useRecords("traces", farmerId), e = useRecords("expenses", farmerId), i = useRecords("inventory", farmerId);
  const loading = [h, l, t, e, i].some((q) => q.isLoading);
  const score = loading ? null : computeScore({ harvests: h.data ?? [], losses: l.data ?? [], traces: t.data ?? [],
    recordDates: [...(h.data ?? []), ...(l.data ?? []), ...(e.data ?? []), ...(i.data ?? [])].map((x) => x.date) });
  return { score, loading, harvests: h.data ?? [], losses: l.data ?? [], traces: t.data ?? [], expenses: e.data ?? [], inventory: i.data ?? [] };
}

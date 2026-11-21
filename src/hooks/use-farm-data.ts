import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
type Res = "harvests" | "expenses" | "losses" | "inventory" | "traces" | "reports";
export function useRecords<R extends Res>(res: R, farmerId?: string) {
  return useQuery({ queryKey: [res, farmerId ?? "me"], queryFn: () => api[res].list(farmerId) as ReturnType<(typeof api)[R]["list"]> });
}
export function useInvalidate() { const qc = useQueryClient(); return (...keys: string[]) => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] })); }
export { useMutation };

import type { Harvest, User } from "@/lib/types";

export interface BatchSearchResult {
  harvest: Harvest;
  farmer: User | null;
}

export function searchHarvestBatches(harvests: Harvest[], users: User[], query: string, limit = 6): BatchSearchResult[] {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return [];

  const farmers = new Map(users.map((user) => [user.id, user]));
  return harvests
    .map((harvest) => ({ harvest, farmer: farmers.get(harvest.farmer_id) ?? null }))
    .filter(({ harvest, farmer }) => [
      harvest.batch_code,
      harvest.crop,
      harvest.location,
      farmer?.name ?? "",
      farmer?.county ?? "",
      farmer?.phone ?? "",
    ].join(" ").toLocaleLowerCase().includes(q))
    .sort((a, b) => {
      const aCode = a.harvest.batch_code.toLocaleLowerCase();
      const bCode = b.harvest.batch_code.toLocaleLowerCase();
      const aRank = aCode === q ? 0 : aCode.startsWith(q) ? 1 : 2;
      const bRank = bCode === q ? 0 : bCode.startsWith(q) ? 1 : 2;
      return aRank - bRank || b.harvest.date.localeCompare(a.harvest.date);
    })
    .slice(0, limit);
}

import { describe, expect, it } from "vitest";
import { searchHarvestBatches } from "@/lib/batch-search";
import type { Harvest, User } from "@/lib/types";

const farmer: User = {
  id: "farmer-1",
  name: "Massa Kollie",
  phone: "+231770000001",
  county: "Bong",
  farm_type: "Rice",
  role: "farmer",
  active: true,
  created_at: "2026-01-10T00:00:00.000Z",
};
const harvest: Harvest = {
  id: "harvest-1",
  farmer_id: farmer.id,
  crop: "Rice",
  quantity_kg: 850,
  grade: "A",
  date: "2026-10-15",
  batch_code: "LR-BONG-0001",
  location: "Gbarnga",
};

describe("Ministry harvest batch search", () => {
  it("finds a harvest by a case-insensitive partial batch code", () => {
    const results = searchHarvestBatches([harvest], [farmer], "bong-0001");
    expect(results[0]?.harvest.id).toBe("harvest-1");
  });

  it("finds a batch through its farmer name or crop", () => {
    expect(searchHarvestBatches([harvest], [farmer], "massa")[0]?.harvest.id).toBe("harvest-1");
    expect(searchHarvestBatches([harvest], [farmer], "rice")[0]?.harvest.id).toBe("harvest-1");
  });

  it("returns no batch results for a blank or unknown query", () => {
    expect(searchHarvestBatches([harvest], [farmer], "")).toEqual([]);
    expect(searchHarvestBatches([harvest], [farmer], "unknown-batch")).toEqual([]);
  });
});

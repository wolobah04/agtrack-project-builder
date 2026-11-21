import { describe, expect, it } from "vitest";
import { answer } from "./assistant";
import { todayISO } from "./constants";
import type { Harvest, Trace } from "./types";

const empty = { county: "Nimba", harvests: [], traces: [], stock: [], expenses: [], losses: [] };

describe("browser-demo farm assistant quality score", () => {
  it("reports zero when the farmer has no saved records", async () => {
    const reply = await answer("What is my quality score?", empty);
    expect(reply).toContain("0/100");
    expect(reply).toContain("no saved farm records");
  });

  it("uses the same real-record calculation as the score page", async () => {
    const date = todayISO();
    const harvest: Harvest = { id: "h", farmer_id: "f", crop: "Rice", quantity_kg: 100, grade: "A", date, batch_code: "LR-RIC-1000", location: "Nimba" };
    const trace: Trace = { id: "t", farmer_id: "f", batch_code: "LR-RIC-1000", stage: "Harvest", location: "Nimba", actor: "Mary", date };
    const reply = await answer("Explain my quality score", { ...empty, harvests: [harvest], traces: [trace] });
    expect(reply).toContain("53/100");
    expect(reply).toContain("2 saved records");
    expect(reply).toContain("100 kg harvested");
    expect(reply).toContain("0 of 1 batches fully traced");
  });
});

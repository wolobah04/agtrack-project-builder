import { describe, expect, it } from "vitest";
import { buildGroqMessages, buildSystemPrompt, questionCounty } from "./farm-assistant";
import { computeFarmScore } from "./score";
import type { Harvest, Trace } from "./types";
import type { Forecast } from "./weather";

const forecast: Forecast = {
  current: { temperature: 28, humidity: 81, wind: 9, code: 61, rain: 0.4 },
  daily: [{ date: "2026-11-21", max: 30, min: 23, rain: 12.4, rainChance: 75, code: 61 }],
};
const harvest: Harvest = { id: "h", farmer_id: "private-owner", crop: "Rice", quantity_kg: 100, grade: "A", date: "2026-11-20", batch_code: "LR-RIC-1000", location: "Nimba" };
const traces: Trace[] = [
  { id: "t1", farmer_id: "private-owner", batch_code: "LR-RIC-1000", stage: "Harvest", location: "Nimba", actor: "Mary", date: "2026-11-20" },
  { id: "t2", farmer_id: "private-owner", batch_code: "LR-RIC-1000", stage: "Storage", location: "Nimba", actor: "Mary", date: "2026-11-21" },
];

describe("AI farm assistant context", () => {
  it("uses a county named in the question instead of the profile county", () => {
    expect(questionCounty("Should I water rice in Lofa today?", "Nimba")).toBe("Lofa");
    expect(questionCounty("Should I water rice today?", "Nimba")).toBe("Nimba");
  });

  it("grounds prompts in live rain data and calculated farm stock", () => {
    const prompt = buildSystemPrompt({
      farmer: { name: "Mary", county: "Nimba", farm_type: "Rice" },
      weatherCounty: "Nimba",
      forecast,
      fetchedAt: "2026-11-21T04:50:00.000Z",
      harvests: [],
      expenses: [],
      losses: [],
      traces: [],
      inventory: [
        { id: "a", farmer_id: "private-owner", item: "Rice seed", type: "in", quantity: 20, unit: "kg", date: "2026-11-20", note: "" },
        { id: "b", farmer_id: "private-owner", item: "Rice seed", type: "out", quantity: 2, unit: "kg", date: "2026-11-21", note: "" },
      ],
    });

    expect(prompt).toContain('"rainChance":75');
    expect(prompt).toContain('"rain":12.4');
    expect(prompt).toContain('"quantity":18');
    expect(prompt).toContain("Today is the first daily entry");
    expect(prompt).not.toContain("private-owner");
  });

  it("gives Groq the exact score calculated from the same saved records", () => {
    const records = {
      harvests: [harvest], expenses: [], losses: [], traces,
      inventory: [{ id: "i", farmer_id: "private-owner", item: "Rice seed", type: "in" as const, quantity: 20, unit: "kg", date: "2026-11-21", note: "" }],
    };
    const fetchedAt = "2026-11-21T04:50:00.000Z";
    const score = computeFarmScore(records, new Date(fetchedAt));
    const prompt = buildSystemPrompt({
      farmer: { name: "Mary", county: "Nimba", farm_type: "Rice" }, weatherCounty: "Nimba", forecast, fetchedAt, ...records,
    });

    expect(score.total).toBe(81);
    expect(prompt).toContain(`"total_out_of_100":${score.total}`);
    expect(prompt).toContain(`"saved_records_used":${score.recordCount}`);
    expect(prompt).toContain('"fully_traced_batches":1');
    expect(prompt).toContain('"harvested_kg":100');
  });

  it("keeps the latest question last and maps saved bot messages to the assistant role", () => {
    const messages = buildGroqMessages("System rules", [{ role: "bot", text: "Earlier answer" }], "Can I water today?");
    expect(messages[1]).toEqual({ role: "assistant", content: "Earlier answer" });
    expect(messages.at(-1)).toEqual({ role: "user", content: "Can I water today?" });
  });
});

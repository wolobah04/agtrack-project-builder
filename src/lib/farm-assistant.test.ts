import { describe, expect, it } from "vitest";
import { buildGroqMessages, buildSystemPrompt, questionCounty } from "./farm-assistant";
import type { Forecast } from "./weather";

const forecast: Forecast = {
  current: { temperature: 28, humidity: 81, wind: 9, code: 61, rain: 0.4 },
  daily: [{ date: "2026-11-21", max: 30, min: 23, rain: 12.4, rainChance: 75, code: 61 }],
};

describe("AI farm assistant context", () => {
  it("uses a county named in the question instead of the profile county", () => {
    expect(questionCounty("Should I water rice in Lofa today?", "Nimba")).toBe("Lofa");
    expect(questionCounty("Should I water rice today?", "Nimba")).toBe("Nimba");
  });

  it("grounds prompts in live rain data and calculated farm stock", () => {
    const prompt = buildSystemPrompt({
      farmer: { name: "Mary", county: "Nimba", farm_type: "Rice" },
      forecast,
      fetchedAt: "2026-11-21T04:50:00.000Z",
      harvests: [],
      expenses: [],
      losses: [],
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

  it("keeps the latest question last and maps saved bot messages to the assistant role", () => {
    const messages = buildGroqMessages("System rules", [{ role: "bot", text: "Earlier answer" }], "Can I water today?");
    expect(messages[1]).toEqual({ role: "assistant", content: "Earlier answer" });
    expect(messages.at(-1)).toEqual({ role: "user", content: "Can I water today?" });
  });
});

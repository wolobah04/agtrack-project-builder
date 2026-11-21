import { describe, expect, it } from "vitest";
import { cleanAssistantReply } from "./farm-assistant";
describe("cleanAssistantReply", () => {
  it("removes markdown and emoji symbols", () => {
    expect(cleanAssistantReply("## Advice 🌧️\n**Water** your *rice* today.\n* Check soil")).toBe("Advice\nWater your rice today.\n- Check soil");
  });
});

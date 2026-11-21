import { beforeEach, describe, expect, it, vi } from "vitest";
import { appwriteAssistant } from "./appwrite";
import { setSession } from "./auth";
import type { Forecast } from "./weather";

const mocks = vi.hoisted(() => ({ askFarmAssistant: vi.fn(), getForecast: vi.fn() }));

vi.mock("./appwrite.functions", () => ({
  appwriteChatHistory: vi.fn(),
  appwriteHealthCheck: vi.fn(),
  askFarmAssistant: mocks.askFarmAssistant,
  appwriteNationalData: vi.fn(),
  getAppwriteAuditLog: vi.fn(),
  getAppwriteBatchHistory: vi.fn(),
  accountAppwrite: vi.fn(),
  loginAppwrite: vi.fn(),
  manageAppwriteUsers: vi.fn(),
  mutateAppwriteRecord: vi.fn(),
  registerAppwriteUser: vi.fn(),
}));
vi.mock("./weather", () => ({ getForecast: mocks.getForecast }));

const forecast: Forecast = {
  current: { temperature: 30, humidity: 75, wind: 3.2, code: 1, rain: 0 },
  daily: [{ date: "2026-11-21", max: 31, min: 24, rain: 2.8, rainChance: 60, code: 3 }],
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  setSession({
    token: "test-token",
    user: { id: "farmer-1", name: "Mary", phone: "+231770000001", county: "Bomi", farm_type: "Rice", role: "farmer", active: true, created_at: "2026-11-21" },
  });
  mocks.askFarmAssistant.mockResolvedValue({ reply: "Answer", weatherCounty: "Lofa", weatherLive: true });
});

describe("Appwrite AI weather handoff", () => {
  it("sends the browser's live forecast for the county named in the question", async () => {
    mocks.getForecast.mockResolvedValue(forecast);
    const message = "Should I water rice in Lofa today?";

    await appwriteAssistant.ask(message, []);

    expect(mocks.getForecast).toHaveBeenCalledWith("Lofa");
    expect(mocks.askFarmAssistant).toHaveBeenCalledWith({ data: { jwt: "test-token", message, history: [], forecast } });
  });

  it("passes an explicit unavailable result instead of triggering the rate-limited server fallback", async () => {
    mocks.getForecast.mockRejectedValue(new Error("Browser weather unavailable"));

    await appwriteAssistant.ask("What is the weather today?", []);

    expect(mocks.askFarmAssistant).toHaveBeenCalledWith({
      data: { jwt: "test-token", message: "What is the weather today?", history: [], forecast: null },
    });
  });
});

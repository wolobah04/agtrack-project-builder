import { afterEach, describe, expect, it, vi } from "vitest";
import { getForecast } from "./weather";

const payload = {
  current: {
    temperature_2m: 30,
    relative_humidity_2m: 75,
    wind_speed_10m: 3.2,
    weather_code: 1,
    precipitation: 0,
  },
  daily: {
    time: ["2026-11-21"],
    temperature_2m_max: [31],
    temperature_2m_min: [24],
    precipitation_sum: [2.8],
    precipitation_probability_max: [60],
    weather_code: [3],
  },
};

afterEach(() => vi.unstubAllGlobals());

describe("Open-Meteo forecast requests", () => {
  it("identifies AgTrack so server-side requests are not rejected as generic traffic", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue({ ok: true, json: async () => payload } as Response);
    vi.stubGlobal("fetch", fetchMock);

    const forecast = await getForecast("Bomi");

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain("latitude=6.75&longitude=-10.85");
    expect(init?.headers).toMatchObject({
      Accept: "application/json",
      "User-Agent": "AgTrack/1.0 (+https://agtrack.online)",
    });
    expect(forecast.current.temperature).toBe(30);
    expect(forecast.daily[0]).toMatchObject({ date: "2026-11-21", rain: 2.8, rainChance: 60 });
  });

  it("preserves the provider status for server-side diagnostics", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue({ ok: false, status: 403 } as Response));

    await expect(getForecast("Bomi")).rejects.toThrow("Weather service returned 403");
  });
});

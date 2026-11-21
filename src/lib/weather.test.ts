import { afterEach, describe, expect, it, vi } from "vitest";
import { getForecast } from "./weather";

const payload = {
  current: { temperature_2m: 25.2, relative_humidity_2m: 94, wind_speed_10m: 4.5, weather_code: 51, precipitation: 0.1 },
  daily: {
    time: ["2026-11-21"], temperature_2m_max: [29.2], temperature_2m_min: [25],
    precipitation_sum: [1.7], precipitation_probability_max: [97], weather_code: [51],
  },
};

afterEach(() => vi.unstubAllGlobals());

describe("Open-Meteo forecast requests", () => {
  it("identifies AgTrack and preserves today's live rain values", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const forecast = await getForecast("Montserrado");

    const [url, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("latitude=6.31");
    expect(url).toContain("timezone=Africa%2FMonrovia");
    expect(new Headers(options.headers).get("User-Agent")).toBe("AgTrack/1.0 (+https://agtrack.online)");
    expect(forecast.current).toEqual({ temperature: 25.2, humidity: 94, wind: 4.5, code: 51, rain: 0.1 });
    expect(forecast.daily[0]).toEqual({ date: "2026-11-21", max: 29.2, min: 25, rain: 1.7, rainChance: 97, code: 51 });
  });

  it("retries a temporary service failure and returns the recovered forecast", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("temporarily unavailable", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(payload), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const forecast = await getForecast("Nimba");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(forecast.daily[0]?.rainChance).toBe(97);
  });

  it("does not retry a rejected request and preserves its HTTP status for server logs", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("Forbidden", { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getForecast("Bomi")).rejects.toThrow("HTTP 403: Forbidden");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

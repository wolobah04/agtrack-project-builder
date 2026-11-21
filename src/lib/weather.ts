import { COUNTIES } from "./constants";
export interface Forecast {
  current: { temperature: number; humidity: number; wind: number; code: number; rain: number };
  daily: { date: string; max: number; min: number; rain: number; rainChance: number; code: number }[];
}
type OpenMeteoResponse = {
  current?: { temperature_2m?: number; relative_humidity_2m?: number; wind_speed_10m?: number; weather_code?: number; precipitation?: number };
  daily?: { time?: string[]; temperature_2m_max?: number[]; temperature_2m_min?: number[]; precipitation_sum?: number[]; precipitation_probability_max?: (number | null)[]; weather_code?: number[] };
};

async function requestForecast(url: string): Promise<OpenMeteoResponse> {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "AgTrack/1.0 (+https://agtrack.online)" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 200);
    const error = new Error(`Weather service returned HTTP ${response.status}${detail ? `: ${detail}` : ""}`);
    error.name = response.status === 429 || response.status >= 500 ? "RetryableWeatherError" : "WeatherRequestError";
    throw error;
  }
  return await response.json() as OpenMeteoResponse;
}

export async function getForecast(county: string): Promise<Forecast> {
  const c = COUNTIES[county] ?? COUNTIES["Montserrado"]!;
  const params = new URLSearchParams({
    latitude: String(c.lat), longitude: String(c.lon),
    current: "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,precipitation",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max",
    timezone: "Africa/Monrovia", forecast_days: "7",
  });
  const url = `https://api.open-meteo.com/v1/forecast?${params}`;
  let j: OpenMeteoResponse | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    try { j = await requestForecast(url); break; }
    catch (error) {
      const retryable = error instanceof Error && ["RetryableWeatherError", "TypeError", "AbortError", "TimeoutError"].includes(error.name);
      if (attempt === 1 || !retryable) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  const current = j?.current;
  const daily = j?.daily;
  if (!current || !daily?.time || !daily.temperature_2m_max || !daily.temperature_2m_min || !daily.precipitation_sum || !daily.precipitation_probability_max || !daily.weather_code) {
    throw new Error("Weather service returned an incomplete forecast");
  }
  const currentValues = [current.temperature_2m, current.relative_humidity_2m, current.wind_speed_10m, current.weather_code, current.precipitation];
  if (!currentValues.every((value) => typeof value === "number" && Number.isFinite(value))) throw new Error("Weather service returned incomplete current conditions");
  return {
    current: { temperature: current.temperature_2m!, humidity: current.relative_humidity_2m!, wind: current.wind_speed_10m!, code: current.weather_code!, rain: current.precipitation! },
    daily: daily.time.map((date, i) => ({ date, max: daily.temperature_2m_max![i]!, min: daily.temperature_2m_min![i]!, rain: daily.precipitation_sum![i]!, rainChance: daily.precipitation_probability_max![i] ?? 0, code: daily.weather_code![i]! })),
  };
}
export function describe(code: number) {
  if (code === 0) return "Clear sky"; if (code <= 3) return "Partly cloudy"; if (code <= 48) return "Foggy";
  if (code <= 67) return "Rain"; if (code <= 82) return "Rain showers"; return "Thunderstorm";
}
/** Simple farming advice from forecast numbers. */
export function farmTips(f: Forecast) {
  const tips: string[] = [];
  const dry = f.daily.filter((d) => d.rainChance < 40 && d.rain < 2);
  const wet = f.daily.filter((d) => d.rain >= 5);
  if (dry.length) tips.push(`Best days to spray or dry harvest: ${dry.slice(0, 3).map((d) => weekday(d.date)).join(", ")} (low rain chance).`);
  if (wet.length) tips.push(`Good soil moisture for planting expected around ${wet.slice(0, 2).map((d) => weekday(d.date)).join(" and ")}.`);
  if (wet.length >= 4) tips.push("Heavy rain most of the week: clear drainage channels and keep harvest covered.");
  if (f.daily.some((d) => d.max >= 33)) tips.push("Very hot days ahead: water seedlings early in the morning.");
  if (!tips.length) tips.push("Normal week. Keep recording your activities every day.");
  return tips;
}
export const weekday = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short" });

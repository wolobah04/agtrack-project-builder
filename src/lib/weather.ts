import { COUNTIES } from "./constants";
export interface Forecast {
  current: { temperature: number; humidity: number; wind: number; code: number; rain: number };
  daily: { date: string; max: number; min: number; rain: number; rainChance: number; code: number }[];
}
export async function getForecast(county: string): Promise<Forecast> {
  const c = COUNTIES[county] ?? COUNTIES["Montserrado"]!;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=Africa%2FMonrovia&forecast_days=7`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("Weather service is not available right now");
  const j = await r.json();
  return {
    current: { temperature: j.current.temperature_2m, humidity: j.current.relative_humidity_2m, wind: j.current.wind_speed_10m, code: j.current.weather_code, rain: j.current.precipitation },
    daily: j.daily.time.map((d: string, i: number) => ({ date: d, max: j.daily.temperature_2m_max[i], min: j.daily.temperature_2m_min[i], rain: j.daily.precipitation_sum[i], rainChance: j.daily.precipitation_probability_max[i] ?? 0, code: j.daily.weather_code[i] })),
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

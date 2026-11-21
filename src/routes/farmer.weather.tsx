import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { CloudRain, Sun, Cloud, CloudLightning, Droplets, Wind, Lightbulb } from "lucide-react";
import { PageHeader, Panel, Loading, ErrorState } from "@/components/agtrack/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from "@/hooks/use-session";
import { COUNTY_NAMES } from "@/lib/constants";
import { describe, farmTips, getForecast, weekday } from "@/lib/weather";

export const Route = createFileRoute("/farmer/weather")({ component: Weather });
const icon = (c: number) => (c === 0 ? Sun : c <= 48 ? Cloud : c <= 82 ? CloudRain : CloudLightning);
function Weather() {
  const s = useSession(); const [county, setCounty] = useState("");
  useEffect(() => { if (s && !county) setCounty(s.user.county); }, [s, county]);
  const q = useQuery({ queryKey: ["wx", county], queryFn: () => getForecast(county), enabled: !!county, staleTime: 30 * 60e3 });
  const C = q.data ? icon(q.data.current.code) : Sun;
  return (
    <>
      <PageHeader title="Weather" subtitle="Live forecast from Open-Meteo" action={
        <Select value={county} onValueChange={setCounty}><SelectTrigger className="h-11 w-44"><SelectValue /></SelectTrigger><SelectContent>{COUNTY_NAMES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>} />
      {q.isLoading ? <Loading rows={4} /> : q.isError || !q.data ? <ErrorState text="Weather service is not available right now. Please try again later." /> : (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl bg-brand p-6 text-accent-foreground shadow-glow">
              <p className="font-semibold">{county} County · Now</p>
              <div className="mt-3 flex items-center gap-4"><C className="size-14" /><p className="font-display text-6xl font-bold">{Math.round(q.data.current.temperature)}°</p></div>
              <p className="mt-2 font-semibold">{describe(q.data.current.code)}</p>
              <div className="mt-4 flex gap-5 text-sm"><span className="flex items-center gap-1"><Droplets className="size-4" />{q.data.current.humidity}%</span><span className="flex items-center gap-1"><Wind className="size-4" />{q.data.current.wind} km/h</span></div>
            </div>
            <Panel title="Farming tips this week" className="lg:col-span-2"><ul className="space-y-3">{farmTips(q.data).map((t) => <li key={t} className="flex gap-3 text-sm"><Lightbulb className="size-5 shrink-0 text-primary" />{t}</li>)}</ul></Panel>
          </div>
          <Panel title="7-day forecast">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">{q.data.daily.map((d) => { const I = icon(d.code); return (
              <div key={d.date} className="rounded-xl bg-muted p-3 text-center"><p className="text-sm font-bold">{weekday(d.date)}</p><I className="mx-auto my-2 size-7 text-primary" /><p className="font-semibold">{Math.round(d.max)}° / {Math.round(d.min)}°</p><p className="text-xs text-muted-foreground">{d.rain.toFixed(1)} mm · {d.rainChance}%</p></div>); })}</div>
          </Panel>
        </div>
      )}
    </>
  );
}

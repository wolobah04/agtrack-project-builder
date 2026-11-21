/** Farm assistant. Uses live Open-Meteo data as its weather tool and the farmer's own records. Never invents weather values. */
import { COUNTY_NAMES, fmtLRD } from "./constants";
import { describe, farmTips, getForecast, weekday } from "./weather";
import { computeFarmScore } from "./score";
import type { Expense, Harvest, InventoryTx, LossRecord, Trace } from "./types";

export async function answer(q: string, ctx: { county: string; harvests: Harvest[]; traces: Trace[]; stock: InventoryTx[]; expenses: Expense[]; losses: LossRecord[] }): Promise<string> {
  const t = q.toLowerCase();
  const county = COUNTY_NAMES.find((c) => t.includes(c.toLowerCase())) ?? ctx.county;
  if (/weather|rain|plant|spray|sun|forecast|tomorrow|week|dry/.test(t)) {
    try {
      const f = await getForecast(county);
      const wet = f.daily.filter((d) => d.rain >= 5).length;
      let a = `Live weather for ${county}: now ${Math.round(f.current.temperature)}°C, ${describe(f.current.code).toLowerCase()}. Next 7 days: ${f.daily.reduce((s, d) => s + d.rain, 0).toFixed(0)} mm rain in total, ${wet} wet day(s).`;
      if (/plant/.test(t)) a += wet >= 2 && wet <= 5 ? " Good time to plant: the soil will have moisture." : wet > 5 ? " Very wet week: plant on raised beds or wait for a break in rain." : " Dry week: wait for rain or water seedlings well before planting.";
      if (/spray/.test(t)) { const dry = f.daily.filter((d) => d.rainChance < 40); a += dry.length ? ` Best days to spray: ${dry.slice(0, 3).map((d) => weekday(d.date)).join(", ")}.` : " Rain is likely every day: spraying may wash off."; }
      return a + "\n\nTip: " + farmTips(f)[0];
    } catch { return "Sorry, I could not get weather data right now. Please try again later."; }
  }
  if (/quality|score/.test(t)) {
    const score = computeFarmScore({ harvests: ctx.harvests, traces: ctx.traces, inventory: ctx.stock, expenses: ctx.expenses, losses: ctx.losses });
    if (!score.hasRecords) return "Your quality score is 0/100 because you have no saved farm records yet. Log a harvest, expense, loss or stock movement to start.";
    return `Your current quality score is ${score.total}/100, calculated from ${score.recordCount} saved records.\n\n• Low losses: ${score.parts.loss.toFixed(1)}/30\n• Record keeping: ${score.parts.completeness.toFixed(1)}/25\n• Harvest grade: ${score.parts.grade.toFixed(1)}/20\n• Traceability: ${score.parts.trace.toFixed(1)}/25\n\nYou have recorded ${score.harvestedKg} kg harvested, ${score.lostKg} kg lost, and ${score.tracedBatches} of ${score.batchCount} batches fully traced.`;
  }
  if (/stock|inventory|store|bags/.test(t)) {
    const lv = ctx.stock.reduce<Record<string, number>>((a, x) => ({ ...a, [`${x.item} (${x.unit})`]: (a[`${x.item} (${x.unit})`] ?? 0) + (x.type === "in" ? x.quantity : -x.quantity) }), {});
    const e = Object.entries(lv); return e.length ? "Your current stock:\n" + e.map(([k, v]) => `• ${k}: ${v}`).join("\n") : "You have no stock recorded yet. Add it on the Inventory page.";
  }
  if (/expense|spend|spent|cost|money/.test(t)) {
    const total = ctx.expenses.reduce((s, x) => s + x.amount, 0); const top = Object.entries(ctx.expenses.reduce<Record<string, number>>((a, x) => ({ ...a, [x.category]: (a[x.category] ?? 0) + x.amount }), {})).sort((a, b) => b[1] - a[1])[0];
    return total ? `You spent ${fmtLRD(total)} in total. Your biggest cost is ${top![0]} (${fmtLRD(top![1])}).` : "No expenses recorded yet.";
  }
  if (/loss|lost|pest|rot/.test(t)) {
    const total = ctx.losses.reduce((s, x) => s + x.quantity_kg, 0); const top = Object.entries(ctx.losses.reduce<Record<string, number>>((a, x) => ({ ...a, [x.cause]: (a[x.cause] ?? 0) + x.quantity_kg }), {})).sort((a, b) => b[1] - a[1])[0];
    if (!total) return "No losses recorded. Keep it up!";
    const fix: Record<string, string> = { Pests: "Use neem spray or approved pesticide and check crops weekly.", "Rot / Spoilage": "Dry produce fully and store on pallets in an airy place.", Flood: "Dig drainage channels and use raised beds.", "Transport damage": "Use strong bags and do not overload vehicles." };
    return `You lost ${total} kg so far. Main cause: ${top![0]}. ${fix[top![0]] ?? ""}`;
  }
  if (/rice/.test(t)) return "Rice: plant at the start of the rainy season (April–June). Keep fields weeded in the first 6 weeks and harvest when 80% of grains are golden.";
  if (/cassava/.test(t)) return "Cassava: plant stem cuttings 20–25 cm long at an angle. Harvest after 9–12 months. Process within 2 days to avoid rot.";
  return "I can help with weather (\"Should I plant rice this week in Lofa?\"), your stock, expenses, losses, and simple crop tips. Ask me a question!";
}

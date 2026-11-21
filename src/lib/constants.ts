export const COUNTIES: Record<string, { lat: number; lon: number; town: string }> = {
  Bomi: { lat: 6.75, lon: -10.85, town: "Tubmanburg" },
  Bong: { lat: 7.0, lon: -9.47, town: "Gbarnga" },
  Gbarpolu: { lat: 7.5, lon: -10.08, town: "Bopolu" },
  "Grand Bassa": { lat: 5.88, lon: -10.05, town: "Buchanan" },
  "Grand Cape Mount": { lat: 7.07, lon: -11.07, town: "Robertsport" },
  "Grand Gedeh": { lat: 6.07, lon: -8.22, town: "Zwedru" },
  "Grand Kru": { lat: 4.75, lon: -8.22, town: "Barclayville" },
  Lofa: { lat: 8.4, lon: -9.75, town: "Voinjama" },
  Margibi: { lat: 6.52, lon: -10.3, town: "Kakata" },
  Maryland: { lat: 4.38, lon: -7.72, town: "Harper" },
  Montserrado: { lat: 6.31, lon: -10.8, town: "Monrovia" },
  Nimba: { lat: 7.0, lon: -8.6, town: "Sanniquellie" },
  "River Cess": { lat: 5.9, lon: -9.45, town: "Cestos City" },
  "River Gee": { lat: 5.26, lon: -7.87, town: "Fish Town" },
  Sinoe: { lat: 5.0, lon: -9.05, town: "Greenville" },
};
export const COUNTY_NAMES = Object.keys(COUNTIES);
export const FARM_TYPES = ["Rice", "Cassava", "Vegetables", "Cocoa", "Rubber", "Oil Palm", "Livestock", "Mixed"];
export const EXPENSE_CATEGORIES = ["Seeds", "Fertilizer", "Labor", "Tools", "Transport", "Pesticide", "Other"];
export const LOSS_CAUSES = ["Pests", "Rot / Spoilage", "Flood", "Drought", "Theft", "Transport damage", "Other"];

export const LIBERIA_PHONE = /^\+231\d{7,9}$/;
export function normalizePhone(v: string) {
  let s = v.replace(/[\s-]/g, "");
  if (s.startsWith("0")) s = "+231" + s.slice(1);
  if (s.startsWith("231")) s = "+" + s;
  return s;
}
export const fmtLRD = (n: number) => `L$ ${Math.round(n).toLocaleString("en-US")}`;
export const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
export const todayISO = () => new Date().toISOString().slice(0, 10);

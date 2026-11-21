import type { AuditLog, Expense, FarmReport, Harvest, InventoryTx, LossRecord, Trace, User } from "./types";
import { COUNTY_NAMES, FARM_TYPES } from "./constants";

const KEY = "agtrack-mock-db-v1";
export interface MockDB {
  users: (User & { password: string })[];
  harvests: Harvest[]; expenses: Expense[]; losses: LossRecord[]; inventory: InventoryTx[];
  traces: Trace[]; reports: FarmReport[]; audit: AuditLog[];
}
export const uid = () => Math.random().toString(36).slice(2, 10);
const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
export const batchCode = (crop: string) => `LR-${crop.slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

function seed(): MockDB {
  const now = new Date().toISOString();
  const users: MockDB["users"] = [
    { id: "f1", name: "Musu Kollie", phone: "+231770000001", county: "Lofa", farm_type: "Rice", role: "farmer", active: true, created_at: daysAgo(90), password: "password123", agent_id: "a1" },
    { id: "a1", name: "James Flomo", phone: "+231770000002", county: "Bong", farm_type: "Mixed", role: "agent", active: true, created_at: daysAgo(120), password: "password123" },
    { id: "m1", name: "Ministry Admin", phone: "+231770000003", county: "Montserrado", farm_type: "Mixed", role: "admin", active: true, created_at: daysAgo(200), password: "password123" },
  ];
  const names = ["Kpana Sumo", "Fatu Kamara", "Joseph Tarr", "Comfort Wesseh", "Moses Gbah", "Hawa Sherif", "Peter Zinnah", "Mary Togba", "Sam Dolo", "Ruth Kpadeh", "Boima Fahnbulleh", "Esther Kollie"];
  names.forEach((n, i) => users.push({ id: `f${i + 2}`, name: n, phone: `+23188${String(1000000 + i * 7919).slice(0, 7)}`, county: COUNTY_NAMES[(i * 4) % 15]!, farm_type: FARM_TYPES[i % 8]!, role: "farmer", active: i !== 5, created_at: daysAgo(10 + i * 6), password: "password123", ...(i < 5 ? { agent_id: "a1" } : {}) }));

  const harvests: Harvest[] = []; const traces: Trace[] = []; const losses: LossRecord[] = []; const expenses: Expense[] = []; const inventory: InventoryTx[] = [];
  const crops = ["Rice", "Cassava", "Pepper", "Cocoa", "Plantain", "Okra"];
  users.filter((u) => u.role === "farmer").forEach((u, ui) => {
    const n = u.id === "f1" ? 7 : 2 + (ui % 3);
    for (let i = 0; i < n; i++) {
      const crop = u.id === "f1" ? ["Rice", "Rice", "Cassava", "Pepper"][i % 4]! : crops[(ui + i) % 6]!;
      const code = `LR-${crop.slice(0, 3).toUpperCase()}-${2400 + ui * 10 + i}`;
      const d = 5 + i * 8 + ui;
      harvests.push({ id: uid(), farmer_id: u.id, crop, quantity_kg: 150 + ((ui * 37 + i * 53) % 400), grade: (["A", "B", "A", "C", null] as const)[(i + ui) % 5]!, date: daysAgo(d), batch_code: code, location: `${u.county} County` });
      traces.push({ id: uid(), farmer_id: u.id, batch_code: code, stage: "Harvest", location: `${u.county} farm`, actor: u.name, date: daysAgo(d) });
      if (i % 3 !== 2) traces.push({ id: uid(), farmer_id: u.id, batch_code: code, stage: "Storage", location: `${u.county} community store`, actor: "Cooperative store", date: daysAgo(d - 1) });
      if (i % 2 === 0) traces.push({ id: uid(), farmer_id: u.id, batch_code: code, stage: "Transfer", location: "Red Light Market, Monrovia", actor: "Buyer truck", date: daysAgo(Math.max(0, d - 3)) });
      if (i % 2 === 1) losses.push({ id: uid(), farmer_id: u.id, crop, quantity_kg: 10 + ((ui + i) * 13) % 60, cause: ["Pests", "Rot / Spoilage", "Flood", "Transport damage"][(ui + i) % 4]!, date: daysAgo(d - 1) });
    }
    ["Seeds", "Fertilizer", "Labor", "Transport", "Tools"].forEach((c, i) => {
      if (u.id === "f1" || i < 2) expenses.push({ id: uid(), farmer_id: u.id, category: c, amount: 1500 + i * 2200 + ui * 300, description: `${c} for the season`, date: daysAgo(3 + i * 6) });
    });
  });
  [["Rice seed", "in", 50, "kg", 40], ["Fertilizer NPK", "in", 4, "bags", 30], ["Rice", "in", 320, "kg", 12], ["Rice", "out", 180, "kg", 6], ["Fertilizer NPK", "out", 2, "bags", 20], ["Cassava", "in", 210, "kg", 9], ["Cassava", "out", 60, "kg", 2]].forEach(([item, type, q, unit, d]) =>
    inventory.push({ id: uid(), farmer_id: "f1", item: item as string, type: type as "in", quantity: q as number, unit: unit as string, date: daysAgo(d as number), note: "" }));
  const audit: AuditLog[] = [
    { id: uid(), actor: "James Flomo", action: "Registered farmer Kpana Sumo", date: daysAgo(4) },
    { id: uid(), actor: "Musu Kollie", action: "Logged harvest LR-RIC-2400", date: daysAgo(5) },
    { id: uid(), actor: "Ministry Admin", action: "Deactivated user Hawa Sherif", date: daysAgo(7) },
    { id: uid(), actor: "System", action: "Generated monthly national report", date: now },
  ];
  return { users, harvests, expenses, losses, inventory, traces, reports: [], audit };
}

let cache: MockDB | null = null;
export function db(): MockDB {
  if (cache) return cache;
  if (typeof window === "undefined") return (cache = seed());
  const raw = localStorage.getItem(KEY);
  cache = raw ? (JSON.parse(raw) as MockDB) : seed();
  save();
  return cache;
}
export function save() { if (typeof window !== "undefined" && cache) localStorage.setItem(KEY, JSON.stringify(cache)); }
export function resetMock() { cache = seed(); save(); }

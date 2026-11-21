/** Offline queue for Field Agent submissions: stored locally and synced when online. */
import { api } from "./api";
const KEY = "agtrack-offline-queue";
export interface QueuedItem { id: string; kind: "harvest" | "expense" | "loss" | "inventory"; payload: any; label: string }
export const getQueue = (): QueuedItem[] => (typeof window === "undefined" ? [] : JSON.parse(localStorage.getItem(KEY) ?? "[]"));
const setQueue = (q: QueuedItem[]) => { localStorage.setItem(KEY, JSON.stringify(q)); window.dispatchEvent(new Event("agtrack-queue")); };
export const enqueue = (i: Omit<QueuedItem, "id">) => setQueue([...getQueue(), { ...i, id: Math.random().toString(36).slice(2) }]);
export async function send(kind: QueuedItem["kind"], payload: any) {
  if (kind === "harvest") return api.harvests.createWithBatch(payload);
  if (kind === "expense") return api.expenses.create(payload);
  if (kind === "loss") return api.losses.create(payload);
  return api.inventory.create(payload);
}
export async function flushQueue() {
  const q = getQueue(); const left: QueuedItem[] = [];
  for (const item of q) { try { await send(item.kind, item.payload); } catch { left.push(item); } }
  setQueue(left); return q.length - left.length;
}

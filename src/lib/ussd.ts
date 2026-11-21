/**
 * USSD/SMS integration layer (placeholder). Real USSD needs a telecom gateway such as
 * Africa's Talking or an Orange Liberia short code. Configure later via env vars:
 *   USSD_PROVIDER, USSD_SHORT_CODE, AFRICASTALKING_API_KEY, AFRICASTALKING_USERNAME
 * The gateway would POST sessions to a server route; that route would call `ussdStep`.
 */
export type UssdState = { path: string[] };
export function ussdStep(path: string[]): { text: string; end?: boolean } {
  const [a, b, c] = path;
  if (!a) return { text: "Welcome to AgTrack\n1. Register\n2. Log harvest\n3. Log expense\n4. Check weather\n5. Check stock" };
  if (a === "1") { if (!b) return { text: "Enter your name:" }; if (!c) return { text: "Enter county number (1-15):" }; return { text: `Thank you ${b}. You are registered. A field agent will visit you.`, end: true }; }
  if (a === "2") { if (!b) return { text: "Enter crop (e.g. Rice):" }; if (!c) return { text: "Enter quantity in kg:" }; return { text: `Saved: ${c} kg ${b}. Batch code LR-${b.slice(0, 3).toUpperCase()}-${1000 + Math.floor(+c % 9000)} sent by SMS.`, end: true }; }
  if (a === "3") { if (!b) return { text: "Category:\n1. Seeds\n2. Fertilizer\n3. Labor\n4. Transport" }; if (!c) return { text: "Enter amount in LRD:" }; return { text: `Expense of L$ ${c} saved.`, end: true }; }
  if (a === "4") return { text: "Lofa: 27°C, rain likely Wed & Thu. Good week to plant rice.", end: true };
  if (a === "5") return { text: "Your stock:\nRice 140 kg\nCassava 150 kg\nFertilizer 2 bags", end: true };
  return { text: "Invalid choice.", end: true };
}

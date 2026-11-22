#!/usr/bin/env node
/**
 * Populate every AgTrack table with linked, clearly labelled demonstration data.
 * Safe to re-run: deterministic IDs are used and existing rows are never updated.
 * Existing non-demo accounts and records are left untouched.
 *
 * Required: APPWRITE_API_KEY
 * Optional: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_DATABASE_ID
 */
import { Client, Query, TablesDB, Teams, Users } from "node-appwrite";

const endpoint = process.env.APPWRITE_ENDPOINT ?? "https://cloud.appwrite.io/v1";
const projectId = process.env.APPWRITE_PROJECT_ID ?? "6b011308003b57f341b6";
const databaseId = process.env.APPWRITE_DATABASE_ID ?? "agtrack";
const apiKey = process.env.APPWRITE_API_KEY;
if (!apiKey) {
  console.error("Missing APPWRITE_API_KEY. Keep this server-only and see docs/appwrite-setup.md.");
  process.exit(1);
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const tables = new TablesDB(client);
const teams = new Teams(client);
const users = new Users(client);
const demoPassword = "AgTrackDemo2026!";
const phoneEmail = (phone) => `${phone.replace(/\D/g, "")}@phone.agtrack.app`;
const tableIds = ["users", "user_roles", "harvests", "expenses", "crop_seasons", "crop_activities", "losses", "inventory", "traces", "reports", "audit", "chat_messages", "notifications"];
const stats = Object.fromEntries(tableIds.map((id) => [id, { created: 0, existing: 0 }]));

const agents = [
  { id: "demo_agent_bintu", name: "Demo Agent - Bintu Sherman", phone: "+231770200101", county: "Bong", verified: true },
  { id: "demo_agent_joseph", name: "Demo Agent - Joseph Kollie", phone: "+231770200102", county: "Lofa", verified: false },
];
const farmers = [
  { id: "demo_farmer_fatu", name: "Demo Farmer - Fatu Kamara", phone: "+231770200111", county: "Bong", farm_type: "Rice", crop: "Rice", variety: "NERICA L-19", plot: "Gbarnga lowland plot", agent_id: "demo_agent_bintu", verified: true },
  { id: "demo_farmer_musa", name: "Demo Farmer - Musa Dolo", phone: "+231770200112", county: "Bong", farm_type: "Cassava", crop: "Cassava", variety: "Improved TMS", plot: "Suakoko upland plot", agent_id: "demo_agent_bintu", verified: true },
  { id: "demo_farmer_mary", name: "Demo Farmer - Mary Tokpah", phone: "+231770200113", county: "Lofa", farm_type: "Vegetables", crop: "Pepper", variety: "Local hot pepper", plot: "Voinjama market garden", agent_id: "demo_agent_joseph", verified: true },
  { id: "demo_farmer_emmanuel", name: "Demo Farmer - Emmanuel Saye", phone: "+231770200114", county: "Lofa", farm_type: "Cocoa", crop: "Cocoa", variety: "Forastero", plot: "Zorzor cocoa block", agent_id: "demo_agent_joseph", verified: false },
];
const accounts = [
  ...agents.map((agent) => ({ ...agent, role: "agent", farm_type: "Mixed" })),
  ...farmers.map((farmer) => ({ ...farmer, role: "farmer" })),
];

const pad = (value) => String(value).padStart(2, "0");
const dateOnly = (date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
const now = new Date();
const day = (offset) => { const value = new Date(now); value.setUTCDate(value.getUTCDate() + offset); return dateOnly(value); };
const stamp = (offset, hour = 9) => `${day(offset)}T${pad(hour)}:00:00.000Z`;
const month = (offset, dayOfMonth = 12) => dateOnly(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, dayOfMonth)));
const cropCode = { Rice: "RICE", Cassava: "CASS", Pepper: "PEPP", Cocoa: "COCO" };
const agentName = (id) => agents.find((agent) => agent.id === id)?.name ?? "Demo field agent";

async function retry(operation) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try { return await operation(); }
    catch (error) {
      if (![429, 500, 502, 503].includes(error?.code) || attempt === 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
}

async function ensureAccount(account) {
  let authUser;
  try {
    authUser = await retry(() => users.get({ userId: account.id }));
  } catch (error) {
    if (error?.code !== 404) throw error;
    authUser = await retry(() => users.create({
      userId: account.id, email: phoneEmail(account.phone), phone: account.phone,
      password: demoPassword, name: account.name,
    }));
    await users.updatePrefs({ userId: account.id, prefs: {
      name: account.name, phone: account.phone, county: account.county,
      farm_type: account.farm_type, role: account.role, ...(account.agent_id ? { agent_id: account.agent_id } : {}),
    } });
  }
  await ensureRow("users", account.id, {
    name: account.name, phone: account.phone, county: account.county, farm_type: account.farm_type,
    active: true, verified: account.verified, ...(account.agent_id ? { agent_id: account.agent_id } : {}), email: phoneEmail(account.phone),
  });
  await ensureRow("user_roles", account.id, { user_id: account.id, role: account.role });
  try {
    await retry(() => teams.createMembership({ teamId: `${account.role}s`, userId: authUser.$id, roles: ["member"] }));
  } catch (error) {
    if (error?.code !== 409) throw error;
  }
}

async function ensureRow(tableId, rowId, data) {
  try {
    await retry(() => tables.createRow({ databaseId, tableId, rowId, data }));
    stats[tableId].created += 1;
  } catch (error) {
    if (error?.code === 409) { stats[tableId].existing += 1; return; }
    throw new Error(`Could not seed ${tableId}/${rowId}: ${error?.message ?? error}`);
  }
}

async function seedRows(tableId, rows) {
  // A small worker pool keeps setup quick without flooding the Appwrite project.
  let cursor = 0;
  await Promise.all(Array.from({ length: 3 }, async () => {
    while (cursor < rows.length) {
      const row = rows[cursor];
      cursor += 1;
      if (row) await ensureRow(tableId, row.id, row.data);
    }
  }));
  console.log(`${tableId}: ${stats[tableId].created} added, ${stats[tableId].existing} already present`);
}

console.log(`\nAgTrack demo data — project ${projectId}, database ${databaseId}`);
console.log("Existing rows are preserved; only missing deterministic demo rows are added.");
for (const account of accounts) await ensureAccount(account);
console.log(`Accounts ready: ${agents.length} agents and ${farmers.length} farmers`);

const harvestRows = [];
const traceRows = [];
const seasonRows = [];
const activityRows = [];
const expenseRows = [];
const lossRows = [];
const inventoryRows = [];
const reportRows = [];
const chatRows = [];
const notificationRows = [];

for (const [farmerIndex, farmer] of farmers.entries()) {
  const key = farmer.id.replace("demo_farmer_", "");
  const mainSeasonId = `demo_season_${key}_main`;
  const previousSeasonId = `demo_season_${key}_previous`;
  const batches = Array.from({ length: 4 }, (_, index) => `DEMO-${cropCode[farmer.crop]}-${key.toUpperCase()}-${index + 1}`);

  for (const [index, batch] of batches.entries()) {
    const harvestDate = index === 3 ? day(-7) : month(index === 0 ? 5 : index === 1 ? 3 : 2, 10 + farmerIndex);
    const quantity = 180 + farmerIndex * 85 + index * 65;
    harvestRows.push({ id: `demo_harvest_${key}_${index + 1}`, data: {
      farmer_id: farmer.id, crop: farmer.crop, quantity_kg: quantity,
      grade: index % 3 === 0 ? "A" : index % 3 === 1 ? "B" : "C", date: harvestDate,
      batch_code: batch, location: `${farmer.plot}, ${farmer.county}`,
    } });
    traceRows.push({ id: `demo_trace_${key}_${index + 1}_harvest`, data: {
      farmer_id: farmer.id, batch_code: batch, stage: "Harvest", location: farmer.plot,
      actor: farmer.name, date: harvestDate,
    } });
    traceRows.push({ id: `demo_trace_${key}_${index + 1}_storage`, data: {
      farmer_id: farmer.id, batch_code: batch, stage: "Storage", location: `${farmer.county} cooperative store`,
      actor: agentName(farmer.agent_id), date: day(-6 + index),
    } });
    if (index === 3) {
      traceRows.push({ id: `demo_trace_${key}_transfer`, data: {
        farmer_id: farmer.id, batch_code: batch, stage: "Transfer", location: `${farmer.county} aggregation centre`,
        actor: agentName(farmer.agent_id), date: day(-4),
      } });
      traceRows.push({ id: `demo_trace_${key}_sale`, data: {
        farmer_id: farmer.id, batch_code: batch, stage: "Sale", location: `${farmer.county} produce market`,
        actor: "Demo licensed produce buyer", date: day(-2),
      } });
    }
  }

  seasonRows.push({ id: mainSeasonId, data: {
    farmer_id: farmer.id, name: `${farmer.crop} main season 2026`, crop: farmer.crop, variety: farmer.variety,
    plot: farmer.plot, planting_date: day(-120), end_date: day(35), batch_code: batches[3], status: "active", created_at: stamp(-120),
  } });
  seasonRows.push({ id: previousSeasonId, data: {
    farmer_id: farmer.id, name: `${farmer.crop} previous season`, crop: farmer.crop, variety: farmer.variety,
    plot: farmer.plot, planting_date: day(-330), end_date: day(-160), batch_code: batches[0], status: "completed", created_at: stamp(-330),
  } });

  const activities = [
    { suffix: "land", title: "Land preparation", offset: -112, status: "completed", notes: "Cleared and marked the field for planting.", public: true, recurrence: null },
    { suffix: "plant", title: "Planting", offset: -105, status: "completed", notes: `Planted ${farmer.variety} at the recommended spacing.`, public: true, recurrence: null },
    { suffix: "weed", title: "Weed and field sanitation", offset: -70, status: "completed", notes: "Removed weeds and checked the plot for early pest damage.", public: false, recurrence: 30 },
    { suffix: "inspect", title: "Crop health inspection", offset: 4, status: "planned", notes: "Check leaves, moisture and signs of pests or disease.", public: false, recurrence: 14 },
    { suffix: "harvest", title: "Harvest readiness check", offset: 24, status: "planned", notes: "Assess maturity and confirm harvest labour and storage.", public: false, recurrence: null },
  ];
  for (const activity of activities) {
    const activityId = `demo_activity_${key}_${activity.suffix}`;
    activityRows.push({ id: activityId, data: {
      farmer_id: farmer.id, season_id: mainSeasonId, title: activity.title,
      planned_date: day(activity.offset), planned_end_date: null, notes: activity.notes,
      status: activity.status, actual_date: activity.status === "completed" ? day(activity.offset + 1) : null,
      actual_notes: activity.status === "completed" ? activity.notes : "", skip_reason: "",
      recurrence_days: activity.recurrence, approved_for_public: activity.public, created_at: stamp(activity.offset - 1),
    } });
  }

  const expenseTemplates = [
    { category: "Seeds", amount: 4500 + farmerIndex * 500, description: `${farmer.variety} planting material`, offset: -106, activity: "plant" },
    { category: "Labor", amount: 3200 + farmerIndex * 350, description: "Land preparation and field clearing", offset: -111, activity: "land" },
    { category: "Transport", amount: 1800 + farmerIndex * 200, description: "Transport harvested produce to the cooperative store", offset: -6, activity: null },
    { category: "Tools", amount: 2500 + farmerIndex * 250, description: "Shared field tools and protective equipment", offset: -75, activity: null },
  ];
  for (const [index, expense] of expenseTemplates.entries()) expenseRows.push({ id: `demo_expense_${key}_${index + 1}`, data: {
    farmer_id: farmer.id, category: expense.category, amount: expense.amount, description: expense.description,
    date: day(expense.offset), season_id: expense.activity ? mainSeasonId : null,
    activity_id: expense.activity ? `demo_activity_${key}_${expense.activity}` : null,
  } });

  for (const [index, loss] of [
    { quantity: 12 + farmerIndex * 3, cause: "Pests", offset: -55 },
    { quantity: 8 + farmerIndex * 2, cause: "Transport damage", offset: -5 },
  ].entries()) lossRows.push({ id: `demo_loss_${key}_${index + 1}`, data: {
    farmer_id: farmer.id, crop: farmer.crop, quantity_kg: loss.quantity, cause: loss.cause, date: day(loss.offset),
  } });

  for (const [index, item] of [
    { item: `${farmer.crop} planting material`, type: "in", quantity: 50 + farmerIndex * 10, unit: "kg", note: "Received for the main season", offset: -108 },
    { item: "NPK fertilizer", type: "in", quantity: 4 + farmerIndex, unit: "bags", note: "Cooperative input stock", offset: -90 },
    { item: "NPK fertilizer", type: "out", quantity: 2, unit: "bags", note: "Applied during field maintenance", offset: -65 },
  ].entries()) inventoryRows.push({ id: `demo_inventory_${key}_${index + 1}`, data: {
    farmer_id: farmer.id, item: item.item, type: item.type, quantity: item.quantity, unit: item.unit,
    date: day(item.offset), note: item.note,
  } });

  for (const [index, period] of ["Previous quarter", "Current season"].entries()) reportRows.push({ id: `demo_report_${key}_${index + 1}`, data: {
    farmer_id: farmer.id, title: `${farmer.crop} farm report - ${period}`, period,
    summary: JSON.stringify({ harvest_kg: 540 + farmerIndex * 180 + index * 120, expenses_lrd: 11000 + farmerIndex * 1250, losses_kg: 20 + farmerIndex * 5, batches: 4 }),
    created_at: stamp(-30 + index * 25),
  } });

  for (const message of [
    { suffix: "question", role: "user", text: `What should I prioritise for my ${farmer.crop.toLowerCase()} crop this week?`, offset: -1, hour: 8 },
    { suffix: "answer", role: "bot", text: `Inspect the ${farmer.plot} for pests and water stress. Record any field work and keep the crop health inspection on schedule.`, offset: -1, hour: 8 },
  ]) chatRows.push({ id: `demo_chat_${key}_${message.suffix}`, data: {
    user_id: farmer.id, role: message.role, text: message.text, created_at: stamp(message.offset, message.hour),
  } });

  notificationRows.push({ id: `demo_notification_${key}_season`, data: {
    user_id: farmer.id, title: "Crop health inspection due soon", body: `Your ${farmer.crop} inspection is planned for ${day(4)}.`, read: false, created_at: stamp(-1),
  } });
  notificationRows.push({ id: `demo_notification_${key}_verification`.slice(0, 36), data: {
    user_id: farmer.id, title: farmer.verified ? "Ministry verification approved" : "Ministry verification pending",
    body: farmer.verified ? "Your farmer account has been verified by the Ministry." : "The Ministry has not verified your farmer account yet.",
    read: farmer.verified, created_at: stamp(-3),
  } });
}

for (const agent of agents) notificationRows.push({ id: `demo_notification_${agent.id.replace("demo_agent_", "")}_verification`.slice(0, 36), data: {
  user_id: agent.id, title: agent.verified ? "Ministry verification approved" : "Ministry verification pending",
  body: agent.verified ? "Your field agent account has been verified by the Ministry." : "The Ministry has not verified your field agent account yet.",
  read: false, created_at: stamp(-2),
} });

await seedRows("harvests", harvestRows);
await seedRows("crop_seasons", seasonRows);
await seedRows("crop_activities", activityRows);
await seedRows("expenses", expenseRows);
await seedRows("losses", lossRows);
await seedRows("inventory", inventoryRows);
await seedRows("traces", traceRows);
await seedRows("reports", reportRows);
await seedRows("chat_messages", chatRows);
await seedRows("notifications", notificationRows);
await seedRows("audit", [
  { id: "demo_audit_seed_started", data: { actor: "AgTrack demo loader", action: "Prepared linked demonstration accounts and farm records", date: stamp(0, 7) } },
  { id: "demo_audit_agent_verified", data: { actor: "Demo Ministry workflow", action: "Verified agent: Demo Agent - Bintu Sherman", date: stamp(-2, 10) } },
  { id: "demo_audit_farmer_verified", data: { actor: "Demo Ministry workflow", action: "Verified farmer: Demo Farmer - Fatu Kamara", date: stamp(-3, 11) } },
  { id: "demo_audit_public_batch", data: { actor: "Demo field agent", action: "Published approved crop activities for buyer traceability", date: stamp(-1, 12) } },
]);

console.log("\nRecord totals after loading:");
for (const tableId of tableIds) {
  const result = await retry(() => tables.listRows({ databaseId, tableId, queries: [Query.limit(1)] }));
  console.log(`${tableId}: ${result.total} total`);
  if (result.total < 1) throw new Error(`${tableId} is still empty after demo loading`);
}

console.log("\nDemo sign-in password for newly created sample accounts: AgTrackDemo2026!");
for (const account of accounts) console.log(`${account.role}: ${account.phone} — ${account.name}`);
console.log("\nDone. Re-run any time; existing demo rows will not be duplicated or overwritten.");

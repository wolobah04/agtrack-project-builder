#!/usr/bin/env node
/**
 * Create or update AgTrack's complete Appwrite schema.
 * Safe to re-run: existing databases, tables, columns, indexes and teams are kept.
 *
 * Required: APPWRITE_PROJECT_ID and APPWRITE_API_KEY
 * Optional: APPWRITE_ENDPOINT, APPWRITE_DATABASE_ID, APPWRITE_ADMIN_NAME,
 *           APPWRITE_ADMIN_PHONE and APPWRITE_ADMIN_PASSWORD
 */
import {
  Client, Databases, ID, OrderBy, Query, TablesDB, TablesDBIndexType, Teams, Users,
} from "node-appwrite";

const endpoint = process.env.APPWRITE_ENDPOINT ?? "https://cloud.appwrite.io/v1";
const projectId = process.env.APPWRITE_PROJECT_ID ?? "6b011308003b57f341b6";
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID ?? "agtrack";
if (!projectId || !apiKey) {
  console.error("Missing APPWRITE_PROJECT_ID or APPWRITE_API_KEY. See docs/appwrite-setup.md.");
  process.exit(1);
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const databases = new Databases(client);
const tables = new TablesDB(client);
const teams = new Teams(client);
const users = new Users(client);

const string = (key, size, required = true) => ({ type: "string", key, size, required });
const float = (key, required = true) => ({ type: "float", key, required, min: 0 });
const boolean = (key, required = true) => ({ type: "boolean", key, required });
const datetime = (key, required = true) => ({ type: "datetime", key, required });
const index = (key, columns, type = TablesDBIndexType.Key, orders) => ({ key, columns, type, orders });
const farmer = string("farmer_id", 36);
const date = string("date", 10);

const schema = [
  {
    id: "users", name: "User profiles",
    columns: [string("name", 128), string("phone", 20), string("county", 80), string("farm_type", 80), boolean("active", true, true), string("agent_id", 36, false), string("email", 254, false)],
    indexes: [index("phone_unique", ["phone"], TablesDBIndexType.Unique), index("agent_id_key", ["agent_id"])],
  },
  {
    id: "user_roles", name: "User roles (separate for security)",
    columns: [string("user_id", 36), string("role", 20)],
    indexes: [index("user_id_unique", ["user_id"], TablesDBIndexType.Unique), index("role_key", ["role"])],
  },
  {
    id: "harvests", name: "Harvests",
    columns: [farmer, string("crop", 100), float("quantity_kg"), string("grade", 1, false), date, string("batch_code", 50), string("location", 200)],
    indexes: [index("farmer_id_key", ["farmer_id"]), index("batch_code_unique", ["batch_code"], TablesDBIndexType.Unique), index("date_key", ["date"], TablesDBIndexType.Key, [OrderBy.Desc])],
  },
  {
    id: "expenses", name: "Farm expenses",
    columns: [farmer, string("category", 80), float("amount"), string("description", 500, false), date],
    indexes: [index("farmer_id_key", ["farmer_id"]), index("date_key", ["date"], TablesDBIndexType.Key, [OrderBy.Desc])],
  },
  {
    id: "losses", name: "Loss records",
    columns: [farmer, string("crop", 100), float("quantity_kg"), string("cause", 100), date],
    indexes: [index("farmer_id_key", ["farmer_id"]), index("date_key", ["date"], TablesDBIndexType.Key, [OrderBy.Desc])],
  },
  {
    id: "inventory", name: "Inventory transactions",
    columns: [farmer, string("item", 120), string("type", 10), float("quantity"), string("unit", 30), date, string("note", 500, false)],
    indexes: [index("farmer_id_key", ["farmer_id"]), index("date_key", ["date"], TablesDBIndexType.Key, [OrderBy.Desc])],
  },
  {
    id: "traces", name: "Traceability stages",
    columns: [farmer, string("batch_code", 50), string("stage", 30), string("location", 200), string("actor", 128), date],
    indexes: [index("farmer_id_key", ["farmer_id"]), index("batch_code_key", ["batch_code"]), index("date_key", ["date"])],
  },
  {
    id: "reports", name: "Farm reports",
    columns: [farmer, string("title", 200), string("period", 50), string("summary", 10000), datetime("created_at")],
    indexes: [index("farmer_id_key", ["farmer_id"]), index("created_at_key", ["created_at"], TablesDBIndexType.Key, [OrderBy.Desc])],
  },
  {
    id: "audit", name: "Activity audit log",
    columns: [string("actor", 128), string("action", 500), datetime("date")],
    indexes: [index("date_key", ["date"], TablesDBIndexType.Key, [OrderBy.Desc])],
  },
  {
    id: "chat_messages", name: "Farm assistant chat history",
    columns: [string("user_id", 36), string("role", 10), string("text", 4000), datetime("created_at")],
    indexes: [index("user_id_key", ["user_id"]), index("created_at_key", ["created_at"])],
  },
  {
    id: "notifications", name: "User notifications",
    columns: [string("user_id", 36), string("title", 200), string("body", 1000), boolean("read", true, false), datetime("created_at")],
    indexes: [index("user_id_key", ["user_id"]), index("created_at_key", ["created_at"], TablesDBIndexType.Key, [OrderBy.Desc])],
  },
];

async function allowConflict(label, operation) {
  try {
    await operation();
    console.log(`Created ${label}`);
  } catch (error) {
    if (error?.code === 409) console.log(`Exists  ${label}`);
    else throw error;
  }
}

async function waitForColumns(tableId, expected) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const table = await tables.getTable({ databaseId, tableId });
    const columns = table.columns.filter((column) => expected.includes(column.key));
    const failed = columns.find((column) => column.status === "failed" || column.status === "stuck");
    if (failed) throw new Error(`Column ${tableId}.${failed.key} failed: ${failed.error ?? "unknown error"}`);
    if (columns.length === expected.length && columns.every((column) => column.status === "available")) return;
    await new Promise((resolve) => setTimeout(resolve, 600));
  }
  throw new Error(`Timed out waiting for columns in ${tableId}`);
}

console.log(`\nAgTrack Appwrite setup — project ${projectId}`);
try {
  await databases.get({ databaseId });
  console.log(`Exists  database ${databaseId}`);
} catch (error) {
  if (error?.code !== 404) throw error;
  await databases.create({ databaseId, name: "AgTrack" });
  console.log(`Created database ${databaseId}`);
}

for (const table of schema) {
  // No client table permissions: every data request is authorized by a server function.
  await allowConflict(`table ${table.id}`, () => tables.createTable({ databaseId, tableId: table.id, name: table.name, permissions: [], rowSecurity: false }));
  const existingTable = await tables.getTable({ databaseId, tableId: table.id });
  for (const column of table.columns) {
    if (existingTable.columns.some((existing) => existing.key === column.key)) {
      console.log(`Exists  column ${table.id}.${column.key}`);
      continue;
    }
    await allowConflict(`column ${table.id}.${column.key}`, async () => {
      const args = { databaseId, tableId: table.id, key: column.key, required: column.required };
      if (column.type === "string") return tables.createStringColumn({ ...args, size: column.size });
      if (column.type === "float") return tables.createFloatColumn({ ...args, min: column.min });
      if (column.type === "boolean") return tables.createBooleanColumn(args);
      if (column.type === "datetime") return tables.createDatetimeColumn(args);
      throw new Error(`Unsupported column type ${column.type}`);
    });
  }
  await waitForColumns(table.id, table.columns.map((column) => column.key));
  for (const item of table.indexes) {
    await allowConflict(`index ${table.id}.${item.key}`, () => tables.createIndex({
      databaseId, tableId: table.id, key: item.key, type: item.type, columns: item.columns,
      ...(item.orders ? { orders: item.orders } : {}),
    }));
  }
}

for (const role of ["farmer", "agent", "admin"]) {
  await allowConflict(`team ${role}s`, () => teams.create({ teamId: `${role}s`, name: role === "admin" ? "Ministry admins" : role === "agent" ? "Field agents" : "Farmers" }));
}

const adminPhone = process.env.APPWRITE_ADMIN_PHONE;
const adminPassword = process.env.APPWRITE_ADMIN_PASSWORD;
if (adminPhone && adminPassword) {
  if (adminPassword.length < 8) throw new Error("APPWRITE_ADMIN_PASSWORD must contain at least 8 characters");
  const adminName = process.env.APPWRITE_ADMIN_NAME ?? "Ministry Admin";
  const email = `${adminPhone.replace(/\D/g, "")}@phone.agtrack.app`;
  let authUser;
  const existing = await users.list({ queries: [Query.equal("email", email)] });
  authUser = existing.users[0];
  if (!authUser) {
    authUser = await users.create({ userId: ID.unique(), email, phone: adminPhone, password: adminPassword, name: adminName });
    console.log(`Created Ministry admin ${adminPhone}`);
  } else {
    await users.updatePassword({ userId: authUser.$id, password: adminPassword });
    console.log(`Exists  Ministry admin ${adminPhone}; password updated`);
  }
  await allowConflict("Ministry admin profile", () => tables.createRow({
    databaseId, tableId: "users", rowId: authUser.$id,
    data: { name: adminName, phone: adminPhone, county: "Montserrado", farm_type: "Mixed", active: true, email },
  }));
  await allowConflict("Ministry admin role", () => tables.createRow({ databaseId, tableId: "user_roles", rowId: authUser.$id, data: { user_id: authUser.$id, role: "admin" } }));
  await allowConflict("Ministry admin team membership", () => teams.createMembership({ teamId: "admins", userId: authUser.$id, roles: ["member"] }));
} else {
  console.log("Skipped first admin (set APPWRITE_ADMIN_PHONE and APPWRITE_ADMIN_PASSWORD to create it)");
}

console.log(`\nDone. ${schema.length} tables are ready in database '${databaseId}'.`);
console.log("Keep APPWRITE_API_KEY server-only. The browser needs only the endpoint and project ID.");

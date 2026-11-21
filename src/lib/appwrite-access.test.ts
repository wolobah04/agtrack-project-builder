import { describe, expect, it } from "vitest";
import { canAccessFarmer, canManageUsers, canReadAudit, canRegisterForAgent } from "./appwrite-access";

const farmer = { id: "farmer-1", role: "farmer" as const, active: true };
const agent = { id: "agent-1", role: "agent" as const, active: true };
const admin = { id: "admin-1", role: "admin" as const, active: true };

describe("Appwrite record access", () => {
  it("lets a farmer access only their own records", () => {
    expect(canAccessFarmer(farmer, "farmer-1")).toBe(true);
    expect(canAccessFarmer(farmer, "farmer-2")).toBe(false);
  });

  it("lets an agent access only farmers assigned to them", () => {
    expect(canAccessFarmer(agent, "farmer-1", ["farmer-1"])).toBe(true);
    expect(canAccessFarmer(agent, "farmer-2", ["farmer-1"])).toBe(false);
  });

  it("lets an active Ministry admin access every farmer", () => {
    expect(canAccessFarmer(admin, "any-farmer")).toBe(true);
  });

  it("blocks every deactivated user's record access", () => {
    expect(canAccessFarmer({ ...admin, active: false }, "any-farmer")).toBe(false);
  });
});

describe("Appwrite administration access", () => {
  it("allows only active Ministry admins to manage users", () => {
    expect(canManageUsers(admin)).toBe(true);
    expect(canManageUsers(agent)).toBe(false);
    expect(canManageUsers({ ...admin, active: false })).toBe(false);
  });

  it("allows an agent to register farmers only under their own ID", () => {
    expect(canRegisterForAgent(agent, "agent-1")).toBe(true);
    expect(canRegisterForAgent(agent, "agent-2")).toBe(false);
    expect(canRegisterForAgent(admin, "agent-2")).toBe(true);
  });

  it("allows only Ministry admins to read the activity log", () => {
    expect(canReadAudit(admin)).toBe(true);
    expect(canReadAudit(farmer)).toBe(false);
  });
});

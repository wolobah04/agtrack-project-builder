import { describe, expect, it } from "vitest";
import { DEFAULT_FARMER_VERIFIED, farmerVerificationPatch } from "./farmer-verification";

const admin = { id: "ministry", role: "admin" as const, active: true };

describe("farmer account verification", () => {
  it("starts new accounts unverified", () => expect(DEFAULT_FARMER_VERIFIED).toBe(false));
  it("lets the Ministry verify a farmer", () => expect(farmerVerificationPatch(admin, "farmer", true)).toEqual({ verified: true }));
  it("lets the Ministry remove verification", () => expect(farmerVerificationPatch(admin, "farmer", false)).toEqual({ verified: false }));
  it("blocks farmers from verifying themselves", () => expect(() => farmerVerificationPatch({ ...admin, role: "farmer" }, "farmer", true)).toThrow("Ministry admin access required"));
  it("blocks field agents from verifying farmers", () => expect(() => farmerVerificationPatch({ ...admin, role: "agent" }, "farmer", true)).toThrow("Ministry admin access required"));
  it("blocks inactive Ministry accounts", () => expect(() => farmerVerificationPatch({ ...admin, active: false }, "farmer", true)).toThrow("Ministry admin access required"));
  it("does not verify agents or Ministry accounts", () => {
    expect(() => farmerVerificationPatch(admin, "agent", true)).toThrow("Only farmer accounts");
    expect(() => farmerVerificationPatch(admin, "admin", true)).toThrow("Only farmer accounts");
  });
});
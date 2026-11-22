import { describe, expect, it } from "vitest";
import { DEFAULT_ACCOUNT_VERIFIED, accountVerificationPatch } from "./farmer-verification";

const admin = { id: "ministry", role: "admin" as const, active: true };

describe("Ministry account verification", () => {
  it("starts new farmer and agent accounts unverified", () => expect(DEFAULT_ACCOUNT_VERIFIED).toBe(false));
  it("lets the Ministry verify a farmer", () => expect(accountVerificationPatch(admin, "farmer", true)).toEqual({ verified: true }));
  it("lets the Ministry verify an agent", () => expect(accountVerificationPatch(admin, "agent", true)).toEqual({ verified: true }));
  it("lets the Ministry remove agent verification", () => expect(accountVerificationPatch(admin, "agent", false)).toEqual({ verified: false }));
  it("blocks farmers from verifying accounts", () => expect(() => accountVerificationPatch({ ...admin, role: "farmer" }, "agent", true)).toThrow("Ministry admin access required"));
  it("blocks field agents from verifying accounts", () => expect(() => accountVerificationPatch({ ...admin, role: "agent" }, "farmer", true)).toThrow("Ministry admin access required"));
  it("blocks inactive Ministry accounts", () => expect(() => accountVerificationPatch({ ...admin, active: false }, "agent", true)).toThrow("Ministry admin access required"));
  it("does not verify Ministry accounts", () => expect(() => accountVerificationPatch(admin, "admin", true)).toThrow("Only farmer and agent accounts"));
});

import { beforeEach, describe, expect, it } from "vitest";
import { clearSession, getSession, setSession, type Session } from "./auth";
import type { User } from "./types";

const user: User = {
  id: "farmer-1",
  name: "Test Farmer",
  phone: "+231770000099",
  county: "Bomi",
  farm_type: "Rice",
  role: "farmer",
  active: true,
  created_at: "2026-01-01T00:00:00.000Z",
};
const session: Session = { token: "saved-session", user };

describe("persistent login session", () => {
  beforeEach(() => localStorage.clear());

  it("keeps a saved session after the old eight-hour expiry has passed", () => {
    localStorage.setItem("agtrack-session", JSON.stringify({ ...session, expires_at: 1 }));

    expect(getSession()).toMatchObject({ token: "saved-session", user: { id: "farmer-1" } });
  });

  it("removes the session only when the user signs out", () => {
    setSession(session);
    expect(getSession()).toEqual(session);

    clearSession();
    expect(getSession()).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { searchUsers, userMatchesQuery } from "@/lib/user-search";
import type { User } from "@/lib/types";

const users: User[] = [
  {
    id: "farmer-1",
    name: "Massa Kollie",
    phone: "+231770000001",
    county: "Bong",
    farm_type: "Rice",
    role: "farmer",
    active: true,
    created_at: "2026-01-10T00:00:00.000Z",
  },
  {
    id: "agent-1",
    name: "Joseph Toe",
    phone: "+231880000002",
    county: "Nimba",
    farm_type: "Mixed",
    role: "agent",
    active: true,
    created_at: "2026-02-12T00:00:00.000Z",
  },
];

describe("Ministry user search", () => {
  it("finds a farmer by a case-insensitive partial name", () => {
    expect(searchUsers(users, "massa").map((user) => user.id)).toEqual(["farmer-1"]);
  });

  it("finds an account using a local or formatted phone number", () => {
    expect(searchUsers(users, "0770000001").map((user) => user.id)).toEqual(["farmer-1"]);
    expect(searchUsers(users, "+231 880 000 002").map((user) => user.id)).toEqual(["agent-1"]);
  });

  it("finds accounts by county and role", () => {
    expect(searchUsers(users, "nimba").map((user) => user.id)).toEqual(["agent-1"]);
    expect(searchUsers(users, "farmer").map((user) => user.id)).toEqual(["farmer-1"]);
  });

  it("shows no global results for a blank query but leaves Management unfiltered", () => {
    expect(searchUsers(users, "   ")).toEqual([]);
    expect(users.filter((user) => userMatchesQuery(user, ""))).toHaveLength(2);
  });
});

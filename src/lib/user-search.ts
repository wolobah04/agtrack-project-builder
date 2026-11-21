import type { User } from "@/lib/types";

const normalize = (value: string) => value.trim().toLocaleLowerCase();
const digits = (value: string) => value.replace(/\D/g, "");
const comparablePhone = (value: string) => {
  const valueDigits = digits(value);
  return valueDigits.startsWith("0") ? `231${valueDigits.slice(1)}` : valueDigits;
};

export function userMatchesQuery(user: User, query: string) {
  const q = normalize(query);
  if (!q) return true;

  const text = [user.name, user.phone, user.county, user.role, user.farm_type]
    .join(" ")
    .toLocaleLowerCase();
  if (text.includes(q)) return true;

  const queryPhone = comparablePhone(query);
  return queryPhone.length >= 3 && comparablePhone(user.phone).includes(queryPhone);
}

export function searchUsers(users: User[], query: string, limit = 8) {
  const q = normalize(query);
  if (!q) return [];

  return users
    .filter((user) => userMatchesQuery(user, q))
    .sort((a, b) => {
      const aName = a.name.toLocaleLowerCase();
      const bName = b.name.toLocaleLowerCase();
      const aRank = aName === q ? 0 : aName.startsWith(q) ? 1 : 2;
      const bRank = bName === q ? 0 : bName.startsWith(q) ? 1 : 2;
      return aRank - bRank || a.name.localeCompare(b.name);
    })
    .slice(0, limit);
}

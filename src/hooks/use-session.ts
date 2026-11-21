import { useEffect, useState } from "react";
import { getSession, type Session } from "@/lib/auth";
export function useSession() {
  const [s, setS] = useState<Session | null>(null);
  useEffect(() => { const f = () => setS(getSession()); f(); window.addEventListener("agtrack-auth", f); return () => window.removeEventListener("agtrack-auth", f); }, []);
  return s;
}

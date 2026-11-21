import { useState } from "react";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COUNTY_NAMES, FARM_TYPES, LIBERIA_PHONE, normalizePhone } from "@/lib/constants";
import { api } from "@/lib/api";
import type { Role, User } from "@/lib/types";

export const registerSchema = z.object({
  phone: z.string().transform(normalizePhone).refine((v) => LIBERIA_PHONE.test(v), "Enter a Liberian number, e.g. +231 77 000 0000"),
  name: z.string().trim().min(2, "Enter your full name").max(80),
  county: z.string().min(1, "Choose your county"),
  farm_type: z.string().min(1, "Choose a farm type"),
  password: z.string().min(6, "Use at least 6 characters").max(72),
});

export function RegisterForm({ role, agentId, submitLabel = "Create account", onDone }: { role: Role; agentId?: string; submitLabel?: string; onDone: (u: User, password: string) => void }) {
  const [f, setF] = useState({ phone: "+231", name: "", county: "", farm_type: "", password: "" });
  const [err, setErr] = useState<Record<string, string>>({}); const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = registerSchema.safeParse(f);
    if (!r.success) { setErr(Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message]))); return; }
    setErr({}); setLoading(true);
    try { const u = await api.auth.signup({ ...r.data, role, ...(agentId ? { agent_id: agentId } : {}) }); onDone(u, r.data.password); }
    catch (x) { toast.error((x as Error).message); } finally { setLoading(false); }
  };
  const field = (k: keyof typeof f, label: string, node: React.ReactNode) => (
    <div className="space-y-1.5"><Label htmlFor={k}>{label}</Label>{node}{err[k] && <p className="text-xs text-destructive">{err[k]}</p>}</div>);
  const sel = (k: "county" | "farm_type", opts: string[], ph: string) => (
    <Select value={f[k]} onValueChange={(v) => setF({ ...f, [k]: v })}><SelectTrigger id={k} className="h-12"><SelectValue placeholder={ph} /></SelectTrigger>
      <SelectContent>{opts.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>);
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {field("phone", "Phone number", <Input id="phone" type="tel" className="h-12" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />)}
      {field("name", "Name", <Input id="name" className="h-12" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />)}
      {field("county", "County", sel("county", COUNTY_NAMES, "Choose county"))}
      {field("farm_type", "Farm type", sel("farm_type", FARM_TYPES, "Choose farm type"))}
      {field("password", "Password", <Input id="password" type="password" className="h-12" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />)}
      <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>{loading && <Loader2 className="animate-spin" />}{submitLabel}</Button>
    </form>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AuthCard } from "@/components/agtrack/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, USE_MOCK } from "@/lib/api";
import { homeFor, setSession } from "@/lib/auth";
import { LIBERIA_PHONE, normalizePhone } from "@/lib/constants";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — AgTrack" }, { name: "description", content: "Sign in to your AgTrack farm account with your phone number." }, { property: "og:title", content: "Sign in — AgTrack" }, { property: "og:description", content: "Sign in to your AgTrack farm account." }] }),
  component: Login,
});

function Login() {
  const nav = useNavigate();
  const [phone, setPhone] = useState("+231"); const [pw, setPw] = useState(""); const [err, setErr] = useState(""); const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); const p = normalizePhone(phone);
    if (!LIBERIA_PHONE.test(p)) return setErr("Enter a Liberian number, e.g. +231 77 000 0000");
    if (!pw) return setErr("Enter your password");
    setErr(""); setLoading(true);
    try { const r = await api.auth.login(p, pw); setSession({ ...r, expires_at: Date.now() + 8 * 3600e3 }); toast.success(`Welcome, ${r.user.name}`); nav({ to: homeFor(r.user.role) }); }
    catch (x) { setErr((x as Error).message); } finally { setLoading(false); }
  };
  return (
    <AuthCard title="Sign in" subtitle="Use the phone number you registered with.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="space-y-1.5"><Label htmlFor="phone">Phone number</Label><Input id="phone" type="tel" className="h-12" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="pw">Password</Label><Input id="pw" type="password" className="h-12" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>{loading && <Loader2 className="animate-spin" />}Sign in</Button>
      </form>
      <div className="mt-5 flex justify-between text-sm font-semibold">
        <Link to="/forgot-password" className="text-primary hover:underline">Forgot password</Link>
        <Link to="/signup" className="text-primary hover:underline">Sign up</Link>
      </div>
      {USE_MOCK && (
        <div className="mt-6 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
          <p className="font-bold text-foreground">Demo accounts (password: password123)</p>
          <p>Farmer +231770000001 · Agent +231770000002 · Ministry +231770000003</p>
        </div>
      )}
    </AuthCard>
  );
}

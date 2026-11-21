import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AuthCard } from "@/components/agtrack/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot password — AgTrack" }, { name: "description", content: "Reset your AgTrack password." }, { property: "og:title", content: "Forgot password — AgTrack" }, { property: "og:description", content: "Reset your AgTrack password." }] }),
  component: Forgot,
});
function Forgot() {
  const [v, setV] = useState(""); const [loading, setLoading] = useState(false); const [sent, setSent] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (v.trim().length < 5) { toast.error("Enter your phone number or email"); return; }
    setLoading(true); try { await api.auth.recover(v.trim()); setSent(true); } catch (x) { toast.error((x as Error).message); } finally { setLoading(false); }
  };
  return (
    <AuthCard title="Forgot password" subtitle="Enter your phone number or email. We will send you a reset link.">
      {sent ? <p className="rounded-xl bg-secondary p-4 text-sm">If an account exists, reset instructions are on their way. You can also ask your field agent for help.</p> : (
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="c">Phone number or email</Label><Input id="c" className="h-12" value={v} onChange={(e) => setV(e.target.value)} maxLength={120} /></div>
          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>{loading && <Loader2 className="animate-spin" />}Send reset link</Button>
        </form>)}
      <p className="mt-5 text-center text-sm"><Link to="/login" className="font-semibold text-primary hover:underline">Back to sign in</Link></p>
    </AuthCard>
  );
}

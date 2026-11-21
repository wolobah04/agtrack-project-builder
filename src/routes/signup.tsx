import { createFileRoute, Link } from "@tanstack/react-router";
import { Sprout, ClipboardList, ArrowRight } from "lucide-react";
import { AuthCard } from "@/components/agtrack/AuthCard";
import { requireGuest } from "@/lib/guard";

export const Route = createFileRoute("/signup")({
  ssr: false,
  beforeLoad: () => requireGuest(),
  head: () => ({ meta: [{ title: "Sign up — AgTrack" }, { name: "description", content: "Create a free AgTrack account as a farmer or field agent." }, { property: "og:title", content: "Sign up — AgTrack" }, { property: "og:description", content: "Create a free AgTrack account." }] }),
  component: () => (
    <AuthCard title="Sign up" subtitle="Who are you?">
      <div className="space-y-3">
        {([["farmer", Sprout, "I'm a Farmer", "Keep records for my own farm"], ["agent", ClipboardList, "I'm a Field Agent", "Register and record for farmers"]] as const).map(([r, I, t, d]) => (
          <Link key={r} to="/register/$role" params={{ role: r }} className="flex items-center gap-4 rounded-2xl border-2 border-border p-4 transition-colors hover:border-leaf hover:bg-secondary">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand text-accent-foreground"><I /></span>
            <span className="flex-1"><span className="block font-bold">{t}</span><span className="text-sm text-muted-foreground">{d}</span></span><ArrowRight className="text-primary" />
          </Link>
        ))}
      </div>
      <p className="mt-5 text-center text-sm">Already registered? <Link to="/login" className="font-semibold text-primary hover:underline">Sign in</Link></p>
    </AuthCard>
  ),
});

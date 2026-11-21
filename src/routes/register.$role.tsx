import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AuthCard } from "@/components/agtrack/AuthCard";
import { RegisterForm } from "@/components/agtrack/RegisterForm";
import { api } from "@/lib/api";
import { homeFor, setSession } from "@/lib/auth";
import { requireGuest } from "@/lib/guard";

export const Route = createFileRoute("/register/$role")({
  ssr: false,
  beforeLoad: ({ params }) => { requireGuest(); if (params.role !== "farmer" && params.role !== "agent") throw notFound(); },
  head: ({ params }) => ({ meta: [{ title: `Register as ${params.role === "agent" ? "Field Agent" : "Farmer"} — AgTrack` }, { name: "description", content: "Register for AgTrack with your phone number, county and farm type." }, { property: "og:title", content: "Register — AgTrack" }, { property: "og:description", content: "Register for AgTrack." }] }),
  component: Register,
});

function Register() {
  const { role } = Route.useParams(); const nav = useNavigate(); const r = role as "farmer" | "agent";
  return (
    <AuthCard title={r === "agent" ? "Field Agent registration" : "Farmer registration"} subtitle="Fill in your details to get started.">
      <RegisterForm role={r} onDone={async (u, pw) => {
        const s = await api.auth.login(u.phone, pw).catch(() => null);
        if (!s) { toast.success("Account created. Please sign in."); return nav({ to: "/login" }); }
        setSession(s); toast.success("Account created!"); nav({ to: homeFor(s.user.role) });
      }} />
      <p className="mt-5 text-center text-sm">Already registered? <Link to="/login" className="font-semibold text-primary hover:underline">Sign in</Link></p>
    </AuthCard>
  );
}

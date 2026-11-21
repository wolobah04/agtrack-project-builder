import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/agtrack/ui";
import { RegisterForm } from "@/components/agtrack/RegisterForm";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/agent/register")({ component: Reg });
function Reg() {
  const s = useSession(); const nav = useNavigate(); const qc = useQueryClient();
  return (
    <>
      <div className="mx-auto max-w-2xl"><PageHeader title="Register Farmer" subtitle="Create an account for a farmer without a smartphone. Give them their password on paper." />
      <Panel className="rounded-3xl p-6 sm:p-8">{s && <RegisterForm role="farmer" agentId={s.user.id} submitLabel="Register farmer" onDone={(u) => { qc.invalidateQueries({ queryKey: ["users"] }); toast.success(`${u.name} registered`); nav({ to: "/agent/record", search: { farmer: u.id } }); }} />}</Panel></div>
    </>
  );
}

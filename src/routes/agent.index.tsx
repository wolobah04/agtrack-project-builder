import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, UserPlus, ClipboardEdit } from "lucide-react";
import { PageHeader, Panel } from "@/components/agtrack/ui";
import { RecordTable } from "@/components/agtrack/RecordTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/hooks/use-session";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/constants";

export const Route = createFileRoute("/agent/")({ component: MyFarmers });
function MyFarmers() {
  const s = useSession(); const [q, setQ] = useState("");
  const users = useQuery({ queryKey: ["users"], queryFn: api.users.list });
  const mine = (users.data ?? []).filter((u) => u.role === "farmer" && u.agent_id === s?.user.id && (u.name + u.phone + u.county).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageHeader title="My Farmers" subtitle="Farmers you registered and support" action={<Button asChild variant="hero"><Link to="/agent/register"><UserPlus />Register</Link></Button>} />
      <Panel>
        <div className="relative mb-4"><Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, phone or county" className="h-11 pl-9" /></div>
        <RecordTable rows={mine} loading={users.isLoading} error={users.isError} empty="No farmers yet. Register your first farmer." cols={[
          { h: "Name", c: (r) => <b>{r.name}</b> }, { h: "Phone", c: (r) => r.phone }, { h: "County", c: (r) => r.county }, { h: "Farm", c: (r) => r.farm_type }, { h: "Since", c: (r) => fmtDate(r.created_at) },
          { h: "", right: true, c: (r) => <Button asChild size="sm" variant="outline"><Link to="/agent/record" search={{ farmer: r.id }}><ClipboardEdit />Record</Link></Button> }]} />
      </Panel>
    </>
  );
}

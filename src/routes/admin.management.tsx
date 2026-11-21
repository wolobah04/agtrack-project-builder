import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { UserPlus, Ban, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/agtrack/ui";
import { RecordTable } from "@/components/agtrack/RecordTable";
import { FormDialog, useDialog } from "@/components/agtrack/FormDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { LIBERIA_PHONE, fmtDate, normalizePhone } from "@/lib/constants";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/admin/management")({ component: Mgmt });
function Mgmt() {
  const q = useQuery({ queryKey: ["users"], queryFn: api.users.list }); const qc = useQueryClient(); const [tab, setTab] = useState("farmer"); const dlg = useDialog(); const me = useSession();
  const refresh = () => { qc.invalidateQueries({ queryKey: ["users"] }); qc.invalidateQueries({ queryKey: ["audit"] }); };
  const rows = (q.data ?? []).filter((u) => u.role === tab);
  return (
    <>
      <PageHeader title="Management" subtitle="Farmers, field agents and Ministry admins" action={<Button variant="hero" onClick={() => dlg.show()}><UserPlus />New admin</Button>} />
      <Tabs value={tab} onValueChange={setTab} className="mb-4"><TabsList className="h-11"><TabsTrigger value="farmer">Farmers</TabsTrigger><TabsTrigger value="agent">Agents</TabsTrigger><TabsTrigger value="admin">Admins</TabsTrigger></TabsList></Tabs>
      <Panel><RecordTable rows={rows} loading={q.isLoading} error={q.isError} empty="No users." cols={[
        { h: "Name", c: (r) => <b>{r.name}</b> }, { h: "Phone", c: (r) => r.phone }, { h: "County", c: (r) => r.county }, { h: "Joined", c: (r) => fmtDate(r.created_at) },
        { h: "Status", c: (r) => r.active ? <Badge>Active</Badge> : <Badge variant="secondary">Deactivated</Badge> },
        { h: "", right: true, c: (r) => r.id === me?.user.id ? null : <div className="flex justify-end gap-1">
          <Button size="icon" variant="ghost" aria-label={r.active ? "Deactivate" : "Activate"} onClick={async () => { await api.users.update(r.id, { active: !r.active }); toast.success(r.active ? "Deactivated" : "Activated"); refresh(); }}>{r.active ? <Ban /> : <CheckCircle2 />}</Button>
          <Button size="icon" variant="ghost" aria-label="Delete" onClick={async () => { if (confirm(`Delete ${r.name}?`)) { await api.users.remove(r.id); toast.success("Deleted"); refresh(); } }}><Trash2 /></Button></div> }]} /></Panel>
      <FormDialog open={dlg.open} onOpenChange={dlg.setOpen} title="Create Ministry admin" fields={[{ name: "name", label: "Name" }, { name: "phone", label: "Phone (+231…)" }, { name: "password", label: "Temporary password" }]} initial={{ phone: "+231" }}
        onSubmit={async (v) => { const phone = normalizePhone(v["phone"]!); if (!LIBERIA_PHONE.test(phone)) throw new Error("Enter a valid +231 phone number"); if (v["password"]!.length < 8) throw new Error("Password needs 8+ characters");
          await api.users.createAdmin({ name: v["name"]!.trim(), phone, password: v["password"]! }); setTab("admin"); refresh(); }} />
    </>
  );
}

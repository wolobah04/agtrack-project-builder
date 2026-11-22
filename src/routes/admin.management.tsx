import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Ban, CheckCircle2, Trash2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/agtrack/ui";
import { RecordTable } from "@/components/agtrack/RecordTable";
import { FormDialog, useDialog } from "@/components/agtrack/FormDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { LIBERIA_PHONE, fmtDate, normalizePhone } from "@/lib/constants";
import { userMatchesQuery } from "@/lib/user-search";
import { useSession } from "@/hooks/use-session";
import type { Role } from "@/lib/types";

interface ManagementSearch { role: Role; q: string }

export const Route = createFileRoute("/admin/management")({
  head: () => ({ meta: [
    { title: "Account management — AgTrack Ministry" },
    { name: "description", content: "Manage AgTrack farmer accounts and Ministry verification." },
    { property: "og:title", content: "Account management — AgTrack Ministry" },
    { property: "og:description", content: "Manage farmer accounts and Ministry verification in AgTrack." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  validateSearch: (search: Record<string, unknown>): ManagementSearch => ({
    role: search["role"] === "agent" || search["role"] === "admin" ? search["role"] : "farmer",
    q: typeof search["q"] === "string" ? search["q"] : "",
  }),
  component: Mgmt,
});

function Mgmt() {
  const q = useQuery({ queryKey: ["users"], queryFn: api.users.list });
  const qc = useQueryClient();
  const dlg = useDialog();
  const me = useSession();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/management" });
  const setSearch = (role: Role, query: string) => navigate({ replace: true, search: { role, q: query } });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["users"] }); qc.invalidateQueries({ queryKey: ["audit"] }); qc.invalidateQueries({ queryKey: ["national"] }); };
  const verification = useMutation({
    mutationFn: ({ id, verified }: { id: string; verified: boolean }) => api.users.setVerification(id, verified),
    onSuccess: (user) => {
      qc.setQueryData<import("@/lib/types").User[]>(["users"], (users) => users?.map((row) => row.id === user.id ? user : row));
      toast.success(user.verified ? `${user.name} is Ministry verified` : `Verification removed for ${user.name}`);
      refresh();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not update verification"),
  });
  const rows = (q.data ?? []).filter((user) => user.role === search.role && userMatchesQuery(user, search.q));
  const roleLabel = search.role === "agent" ? "agents" : search.role === "admin" ? "admins" : "farmers";

  return (
    <>
      <PageHeader title="Management" subtitle="Farmers, field agents and Ministry admins" action={<Button variant="hero" onClick={() => dlg.show()}><UserPlus />New admin</Button>} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={search.role} onValueChange={(role) => setSearch(role as Role, search.q)}>
          <TabsList className="h-11 rounded-full p-1"><TabsTrigger className="rounded-full px-4" value="farmer">Farmers</TabsTrigger><TabsTrigger className="rounded-full px-4" value="agent">Agents</TabsTrigger><TabsTrigger className="rounded-full px-4" value="admin">Admins</TabsTrigger></TabsList>
        </Tabs>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-4 top-3.5 size-4 text-primary" />
          <Input
            value={search.q}
            onChange={(event) => setSearch(search.role, event.target.value)}
            placeholder={`Search ${roleLabel}…`}
            aria-label={`Search ${roleLabel}`}
            className="h-11 rounded-full border-border bg-card pl-10 pr-10 shadow-sm"
          />
          {search.q && <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1 size-9 rounded-full" onClick={() => setSearch(search.role, "")} aria-label="Clear account search"><X className="size-4" /></Button>}
        </div>
      </div>
      <Panel><RecordTable rows={rows} loading={q.isLoading} error={q.isError} empty={search.q ? `No ${roleLabel} match “${search.q}”.` : `No ${roleLabel} found.`} cols={[
        { h: "Name", c: (r) => <b>{r.name}</b> }, { h: "Phone", c: (r) => r.phone }, { h: "County", c: (r) => r.county }, { h: "Joined", c: (r) => fmtDate(r.created_at) },
        { h: "Status", c: (r) => r.active ? <Badge>Active</Badge> : <Badge variant="secondary">Deactivated</Badge> },
        ...(search.role === "farmer" ? [{ h: "Verification", c: (r: import("@/lib/types").User) => <div className="flex items-center gap-2 whitespace-nowrap">
          <Switch checked={r.verified === true} disabled={verification.isPending} aria-label={`Ministry verification for ${r.name}`} onCheckedChange={(verified) => verification.mutate({ id: r.id, verified })} />
          <span className={r.verified ? "text-sm font-medium text-primary" : "text-sm text-muted-foreground"}>{r.verified ? "Verified" : "Pending"}</span>
        </div> }] : []),
        { h: "", right: true, c: (r) => r.id === me?.user.id ? null : <div className="flex justify-end gap-1">
          <Button size="icon" variant="ghost" aria-label={r.active ? "Deactivate" : "Activate"} onClick={async () => { await api.users.update(r.id, { active: !r.active }); toast.success(r.active ? "Deactivated" : "Activated"); refresh(); }}>{r.active ? <Ban /> : <CheckCircle2 />}</Button>
          <Button size="icon" variant="ghost" aria-label="Delete" onClick={async () => { if (confirm(`Delete ${r.name}?`)) { await api.users.remove(r.id); toast.success("Deleted"); refresh(); } }}><Trash2 /></Button></div> }]} /></Panel>
      <FormDialog open={dlg.open} onOpenChange={dlg.setOpen} title="Create Ministry admin" fields={[{ name: "name", label: "Name" }, { name: "phone", label: "Phone (+231…)" }, { name: "password", label: "Temporary password" }]} initial={{ phone: "+231" }}
        onSubmit={async (v) => { const phone = normalizePhone(v["phone"]!); if (!LIBERIA_PHONE.test(phone)) throw new Error("Enter a valid +231 phone number"); if (v["password"]!.length < 8) throw new Error("Password needs 8+ characters");
          await api.users.createAdmin({ name: v["name"]!.trim(), phone, password: v["password"]! }); setSearch("admin", ""); refresh(); }} />
    </>
  );
}

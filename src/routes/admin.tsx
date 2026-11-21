import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { LayoutDashboard, Users, ScrollText, FileBarChart, Bell, Search } from "lucide-react";
import { DashboardShell } from "@/components/agtrack/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { requireRole } from "@/lib/guard";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/constants";

export const Route = createFileRoute("/admin")({
  ssr: false, beforeLoad: () => requireRole("admin"),
  head: () => ({ meta: [{ title: "Ministry dashboard — AgTrack" }, { name: "robots", content: "noindex" }] }),
  component: AdminLayout,
});
const nav = [{ to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true }, { to: "/admin/management", label: "Management", icon: Users }, { to: "/admin/log", label: "Log", icon: ScrollText }, { to: "/admin/report", label: "Report", icon: FileBarChart }];
function AdminLayout() {
  const log = useQuery({ queryKey: ["audit"], queryFn: api.auditLog }); const [seen, setSeen] = useState(false);
  const recent = (log.data ?? []).slice(0, 5); const users = useQuery({ queryKey: ["users"], queryFn: api.users.list }); const [q, setQ] = useState("");
  const hits = q.length > 1 ? (users.data ?? []).filter((u) => (u.name + u.phone).toLowerCase().includes(q.toLowerCase())).slice(0, 6) : [];
  return (
    <DashboardShell nav={nav} settingsTo="/admin/settings" topbar={<>
      <div className="relative min-w-0 max-w-md flex-1"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users…" className="h-10 pl-9" aria-label="Search" />
        {hits.length > 0 && <div className="absolute left-0 right-0 top-12 z-40 rounded-xl border border-border bg-popover p-1 shadow-soft">{hits.map((u) => <div key={u.id} className="rounded-lg px-3 py-2 text-sm"><b>{u.name}</b> <span className="text-muted-foreground">· {u.role} · {u.county} · {u.phone}</span></div>)}</div>}</div>
      <Popover onOpenChange={(o) => o && setSeen(true)}>
        <PopoverTrigger asChild><Button variant="ghost" size="icon" className="relative ml-auto" aria-label="Notifications"><Bell />{!seen && recent.length > 0 && <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">{recent.length}</span>}</Button></PopoverTrigger>
        <PopoverContent align="end" className="w-80"><p className="mb-2 font-bold">Notifications</p><ul className="space-y-2">{recent.map((a) => <li key={a.id} className="text-sm"><p>{a.action}</p><p className="text-xs text-muted-foreground">{a.actor} · {fmtDate(a.date)}</p></li>)}</ul></PopoverContent>
      </Popover>
    </>}><Outlet /></DashboardShell>
  );
}

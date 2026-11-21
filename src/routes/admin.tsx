import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { LayoutDashboard, Users, ScrollText, FileBarChart, Bell } from "lucide-react";
import { DashboardShell } from "@/components/agtrack/DashboardShell";
import { MinistrySearch } from "@/components/agtrack/MinistrySearch";
import { Button } from "@/components/ui/button";
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
  const recent = (log.data ?? []).slice(0, 5);
  const national = useQuery({ queryKey: ["national"], queryFn: api.national });
  return (
    <DashboardShell nav={nav} settingsTo="/admin/settings" topbar={<>
      <div className="min-w-0 max-w-lg flex-1">
        <MinistrySearch
          users={national.data?.users ?? []}
          harvests={national.data?.harvests ?? []}
          loading={national.isLoading}
          error={national.isError}
        />
      </div>
      <Popover onOpenChange={(o) => o && setSeen(true)}>
        <PopoverTrigger asChild><Button variant="ghost" size="icon" className="relative ml-auto" aria-label="Notifications"><Bell />{!seen && recent.length > 0 && <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">{recent.length}</span>}</Button></PopoverTrigger>
        <PopoverContent align="end" className="w-80"><p className="mb-2 font-bold">Notifications</p><ul className="space-y-2">{recent.map((a) => <li key={a.id} className="text-sm"><p>{a.action}</p><p className="text-xs text-muted-foreground">{a.actor} · {fmtDate(a.date)}</p></li>)}</ul></PopoverContent>
      </Popover>
    </>}><Outlet /></DashboardShell>
  );
}

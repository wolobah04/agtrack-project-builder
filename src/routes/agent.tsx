import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, UserPlus, ClipboardEdit, CloudOff, RefreshCw, Wifi } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/agtrack/DashboardShell";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/guard";
import { flushQueue, getQueue } from "@/lib/offline";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/agent")({
  ssr: false, beforeLoad: () => requireRole("agent"),
  head: () => ({ meta: [{ title: "Field Agent — AgTrack" }, { name: "robots", content: "noindex" }] }),
  component: AgentLayout,
});
const nav = [{ to: "/agent", label: "My Farmers", icon: Users, exact: true }, { to: "/agent/register", label: "Register Farmer", icon: UserPlus }, { to: "/agent/record", label: "Record Data", icon: ClipboardEdit }];

export function useOnline() { const [o, setO] = useState(true); useEffect(() => { const f = () => setO(navigator.onLine); f(); addEventListener("online", f); addEventListener("offline", f); return () => { removeEventListener("online", f); removeEventListener("offline", f); }; }, []); return o; }

function SyncBadge() {
  const online = useOnline(); const [n, setN] = useState(0);
  useEffect(() => { const f = () => setN(getQueue().length); f(); addEventListener("agtrack-queue", f); return () => removeEventListener("agtrack-queue", f); }, []);
  useEffect(() => { if (online && getQueue().length) flushQueue().then((k) => k && toast.success(`Synced ${k} saved record(s)`)); }, [online]);
  return (
    <div className="flex items-center gap-2">
      {online ? <span className="flex items-center gap-1 text-xs font-semibold text-primary"><Wifi className="size-4" />Online</span> : <span className="flex items-center gap-1 text-xs font-semibold text-destructive"><CloudOff className="size-4" />Offline</span>}
      {n > 0 && <Button size="sm" variant="outline" disabled={!online} onClick={() => flushQueue().then((k) => toast.success(`Synced ${k}`))}><RefreshCw />{n} pending sync</Button>}
    </div>
  );
}
function AgentLayout() {
  const s = useSession();
  return <DashboardShell nav={nav} settingsTo="/agent/settings" topbar={<><p className="min-w-0 flex-1 truncate font-display text-lg font-bold">Welcome, {s?.user.name.split(" ")[0] ?? ""}</p><SyncBadge /></>}><Outlet /></DashboardShell>;
}

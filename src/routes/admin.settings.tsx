import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SettingsView } from "@/components/agtrack/SettingsView";
import { Panel } from "@/components/agtrack/ui";
import { api, USE_MOCK } from "@/lib/api";
import { USE_APPWRITE } from "@/lib/appwrite";
export const Route = createFileRoute("/admin/settings")({ component: () => {
  const h = useQuery({ queryKey: ["health"], queryFn: api.health });
  return <><SettingsView farm={false} /><Panel title="System" className="mt-6"><p className="text-sm">Data source: <b>{USE_MOCK ? "Sample data (demo mode)" : USE_APPWRITE ? "Appwrite Cloud" : "AgTrack API"}</b></p><p className="text-sm">API status: <b className={h.data ? "text-primary" : "text-destructive"}>{h.isLoading ? "Checking…" : h.data ? "Online" : "Unreachable"}</b></p></Panel></>;
} });

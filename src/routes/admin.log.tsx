import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, Panel } from "@/components/agtrack/ui";
import { RecordTable } from "@/components/agtrack/RecordTable";
import { api } from "@/lib/api";
export const Route = createFileRoute("/admin/log")({ component: () => {
  const q = useQuery({ queryKey: ["audit"], queryFn: api.auditLog });
  return <><PageHeader title="Activity Log" subtitle="Key actions across the system" /><Panel><RecordTable rows={q.data} loading={q.isLoading} error={q.isError} empty="No activity yet." cols={[
    { h: "When", c: (r) => new Date(r.date).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) }, { h: "Who", c: (r) => <b>{r.actor}</b> }, { h: "Action", c: (r) => r.action }]} /></Panel></>;
} });

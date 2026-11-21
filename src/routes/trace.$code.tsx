import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck } from "lucide-react";
import { PublicLayout } from "@/components/agtrack/PublicLayout";
import { BatchTimeline } from "@/components/agtrack/BatchTimeline";
import { Loading } from "@/components/agtrack/ui";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/constants";

export const Route = createFileRoute("/trace/$code")({
  ssr: false,
  head: ({ params }) => ({ meta: [{ title: `Batch ${params.code} — AgTrack` }, { name: "description", content: `Traceability history for produce batch ${params.code}.` }, { property: "og:title", content: `Batch ${params.code} — AgTrack` }, { property: "og:description", content: "Verified farm-to-market history." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Trace,
});
function Trace() {
  const { code } = Route.useParams();
  const { data, isLoading } = useQuery({ queryKey: ["batch", code], queryFn: () => api.batchHistory(code) });
  return (
    <PublicLayout>
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
          <p className="text-sm font-bold text-primary">Batch history</p>
          <h1 className="mt-1 text-3xl font-bold">{code}</h1>
          <div className="mt-6">{isLoading ? <Loading /> : !data ? <p>No batch found. <Link to="/" hash="lookup" className="text-primary underline">Try another code</Link></p> : (
            <><p className="mb-5 text-muted-foreground">{data.crop} from {data.county} County{data.grade ? ` · Grade ${data.grade}` : ""}</p><BatchTimeline stages={data.stages} />
              {data.activities?.length > 0 && <section className="mt-8 border-t border-border pt-6"><div className="mb-4 flex items-center gap-2"><CalendarCheck className="size-5 text-primary" /><h2 className="text-lg font-bold">Approved field work</h2></div><ol className="space-y-4">{data.activities.map((activity) => <li key={activity.id} className="rounded-xl bg-secondary p-4"><div className="flex flex-wrap justify-between gap-2"><p className="font-bold">{activity.title}</p><p className="text-sm font-semibold text-primary">{fmtDate(activity.actual_date)}</p></div><p className="mt-1 text-xs text-muted-foreground">Originally planned for {fmtDate(activity.planned_date)} · Completed work approved by the farmer</p>{activity.notes && <p className="mt-2 text-sm">{activity.notes}</p>}</li>)}</ol></section>}
            </>)}</div>
        </div>
      </div>
    </PublicLayout>
  );
}

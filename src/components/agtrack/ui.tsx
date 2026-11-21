import type { LucideIcon } from "lucide-react";
import { Inbox, AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
      <div className="min-w-0"><h1 className="truncate text-2xl font-bold sm:text-3xl">{title}</h1>{subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}</div>
      {action}
    </div>
  );
}
export function Panel({ title, action, children, className }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card p-5 shadow-soft", className)}>
      {title && <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-base font-bold">{title}</h2>{action}</div>}
      {children}
    </section>
  );
}
export function StatCard({ icon: Icon, label, value, hint, accent }: { icon: LucideIcon; label: string; value: ReactNode; hint?: string; accent?: boolean }) {
  return (
    <div className={cn("rounded-2xl border border-border p-5 shadow-soft", accent ? "bg-brand text-accent-foreground" : "bg-card")}>
      <div className="flex items-center gap-3">
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", accent ? "bg-card/40" : "bg-secondary text-primary")}><Icon className="size-5" /></span>
        <span className={cn("text-sm font-semibold", accent ? "" : "text-muted-foreground")}>{label}</span>
      </div>
      <div className="mt-3 font-display text-3xl font-bold">{value}</div>
      {hint && <p className={cn("mt-1 text-xs", accent ? "opacity-80" : "text-muted-foreground")}>{hint}</p>}
    </div>
  );
}
export function Empty({ text, icon: Icon = Inbox }: { text: string; icon?: LucideIcon }) {
  return <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground"><Icon className="size-8 opacity-60" /><p className="text-sm">{text}</p></div>;
}
export function ErrorState({ text = "Could not load data. Check your connection and try again." }: { text?: string }) {
  return <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-4 text-sm text-destructive"><AlertTriangle className="size-4" />{text}</div>;
}
export function Loading({ rows = 3 }: { rows?: number }) {
  return <div className="space-y-3">{Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>;
}

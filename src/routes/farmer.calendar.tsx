import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  ListChecks,
  Plus,
  Settings2,
  Sprout,
} from "lucide-react";
import { toast } from "sonner";
import {
  ActivityDialog,
  SeasonDialog,
  SkipDialog,
  WorkDialog,
} from "@/components/agtrack/CropCalendarDialogs";
import { Empty, ErrorState, Loading, PageHeader, Panel } from "@/components/agtrack/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useInvalidate, useRecords } from "@/hooks/use-farm-data";
import { api } from "@/lib/api";
import { activityDueState, type DueState } from "@/lib/crop-calendar";
import { fmtDate, fmtLRD, todayISO } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { CropActivity, CropSeason } from "@/lib/types";

export const Route = createFileRoute("/farmer/calendar")({
  head: () => ({
    meta: [
      { title: "Crop calendar — AgTrack" },
      {
        name: "description",
        content: "Plan crop-season work and record what actually happened on each plot.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CropCalendarPage,
});

const stateLabels: Record<DueState, string> = {
  completed: "Completed",
  skipped: "Skipped",
  overdue: "Overdue",
  due: "Due today",
  upcoming: "Coming up",
};
function StateBadge({ state }: { state: DueState }) {
  return (
    <Badge
      variant={
        state === "overdue"
          ? "destructive"
          : state === "completed" || state === "skipped"
            ? "secondary"
            : state === "upcoming"
              ? "outline"
              : "default"
      }
      className={state === "due" ? "bg-warning text-foreground" : ""}
    >
      {stateLabels[state]}
    </Badge>
  );
}

function CropCalendarPage() {
  const inv = useInvalidate();
  const query = useQuery({ queryKey: ["crop-calendar"], queryFn: () => api.cropCalendar.list() });
  const harvests = useRecords("harvests");
  const expenses = useRecords("expenses");
  const [selectedId, setSelectedId] = useState("");
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [seasonOpen, setSeasonOpen] = useState(false);
  const [editingSeason, setEditingSeason] = useState<CropSeason | null>(null);
  const [activityOpen, setActivityOpen] = useState(false);
  const [workOpen, setWorkOpen] = useState(false);
  const [skipOpen, setSkipOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<CropActivity | null>(null);
  const [workingActivity, setWorkingActivity] = useState<CropActivity | null>(null);
  const [skippingActivity, setSkippingActivity] = useState<CropActivity | null>(null);
  const seasons = useMemo(() => query.data?.seasons ?? [], [query.data]);
  const selected = seasons.find((season) => season.id === selectedId) ?? null;
  const activities = useMemo(
    () => (query.data?.activities ?? []).filter((activity) => activity.season_id === selectedId),
    [query.data, selectedId],
  );
  const today = todayISO();
  useEffect(() => {
    if (seasons.length && !seasons.some((season) => season.id === selectedId))
      setSelectedId(seasons[0]!.id);
  }, [seasons, selectedId]);
  useEffect(() => {
    if (selected) setMonth(startOfMonth(new Date(`${selected.planting_date}T12:00:00`)));
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const saved = () => inv("crop-calendar", "expenses");
  const editActivity = (activity: CropActivity) => {
    setEditingActivity(activity);
    setActivityOpen(true);
  };
  const logWork = (activity: CropActivity | null) => {
    setWorkingActivity(activity);
    setWorkOpen(true);
  };
  const skip = (activity: CropActivity) => {
    setSkippingActivity(activity);
    setSkipOpen(true);
  };
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });
  const activitiesOn = (date: string) =>
    activities.filter(
      (activity) =>
        activity.planned_date <= date &&
        (activity.planned_end_date ?? activity.planned_date) >= date,
    );
  const monthActivities = activities.filter(
    (activity) =>
      activity.planned_date <= format(endOfMonth(month), "yyyy-MM-dd") &&
      (activity.planned_end_date ?? activity.planned_date) >=
        format(startOfMonth(month), "yyyy-MM-dd"),
  );
  const planned = activities.filter((activity) => activity.status === "planned");
  const due = planned.filter((activity) => activityDueState(activity, today) === "due").length;
  const overdue = planned.filter(
    (activity) => activityDueState(activity, today) === "overdue",
  ).length;
  const upcoming = planned.filter(
    (activity) => activityDueState(activity, today) === "upcoming",
  ).length;
  const completed = activities
    .filter((activity) => activity.status === "completed")
    .sort((a, b) => (b.actual_date ?? "").localeCompare(a.actual_date ?? ""));
  const skipped = activities
    .filter((activity) => activity.status === "skipped")
    .sort((a, b) => b.planned_date.localeCompare(a.planned_date));

  const entry = (activity: CropActivity, compact = false) => {
    const state = activityDueState(activity, today);
    return (
      <div
        key={activity.id}
        className={cn(
          "rounded-lg border border-border bg-card text-card-foreground",
          compact ? "p-1.5" : "p-4",
        )}
      >
        <div
          className={cn(
            "flex gap-2",
            compact ? "flex-col" : "flex-wrap items-start justify-between",
          )}
        >
          <button
            type="button"
            disabled={activity.status !== "planned"}
            onClick={() => editActivity(activity)}
            className="min-w-0 text-left text-xs font-bold enabled:hover:text-primary enabled:hover:underline"
          >
            {activity.title}
          </button>
          {!compact && <StateBadge state={state} />}
        </div>
        {!compact && (
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            <p>
              Planned: {fmtDate(activity.planned_date)}
              {activity.planned_end_date ? ` – ${fmtDate(activity.planned_end_date)}` : ""}
            </p>
            {activity.actual_date && <p>Actual: {fmtDate(activity.actual_date)}</p>}
            {activity.notes && <p>{activity.notes}</p>}
            {activity.skip_reason && <p>Reason: {activity.skip_reason}</p>}
          </div>
        )}
        {activity.status === "planned" && (
          <Button
            size="sm"
            variant={state === "overdue" || state === "due" ? "hero" : "outline"}
            className={cn("mt-2", compact ? "h-7 w-full px-1 text-[10px]" : "h-9")}
            onClick={() => logWork(activity)}
          >
            <Check className={compact ? "size-3" : "size-4"} />
            Log work
          </Button>
        )}
      </div>
    );
  };

  return (
    <>
      <PageHeader
        title="Crop calendar"
        subtitle="Plan each crop season, then record the work that actually happened"
        action={
          <Button
            variant="hero"
            onClick={() => {
              setEditingSeason(null);
              setSeasonOpen(true);
            }}
          >
            <Plus />
            New season
          </Button>
        }
      />
      {query.isLoading ? (
        <Loading rows={6} />
      ) : query.isError ? (
        <ErrorState text="Could not load your crop seasons. Please try again." />
      ) : !seasons.length ? (
        <Panel>
          <Empty
            icon={Sprout}
            text="Start a crop season with an editable schedule template or an empty calendar."
          />
          <div className="flex justify-center">
            <Button variant="hero" onClick={() => setSeasonOpen(true)}>
              <Plus />
              Start your first season
            </Button>
          </div>
        </Panel>
      ) : (
        selected && (
          <div className="space-y-6">
            <Panel>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="grid flex-1 gap-4 sm:grid-cols-[minmax(220px,1fr)_auto] sm:items-end">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold" htmlFor="crop-season">
                      Crop season
                    </label>
                    <Select value={selected.id} onValueChange={setSelectedId}>
                      <SelectTrigger id="crop-season" className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {seasons.map((season) => (
                          <SelectItem key={season.id} value={season.id}>
                            {season.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="outline"
                    className="h-11"
                    onClick={() => {
                      setEditingSeason(selected);
                      setSeasonOpen(true);
                    }}
                  >
                    <Settings2 />
                    Season details
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingActivity(null);
                      setActivityOpen(true);
                    }}
                  >
                    <Plus />
                    Plan activity
                  </Button>
                  <Button variant="hero" onClick={() => logWork(null)}>
                    <ListChecks />
                    Log unplanned work
                  </Button>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                <span>
                  <strong className="text-foreground">{selected.crop}</strong>
                  {selected.variety ? ` · ${selected.variety}` : ""}
                </span>
                <span>{selected.plot}</span>
                <span>Planting: {fmtDate(selected.planting_date)}</span>
                <span>
                  {selected.batch_code ? `Batch: ${selected.batch_code}` : "No batch linked"}
                </span>
              </div>
            </Panel>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                { label: "Due today", value: due, icon: Clock3 },
                { label: "Overdue", value: overdue, icon: CircleAlert },
                { label: "Coming up", value: upcoming, icon: CalendarDays },
                { label: "Work logged", value: completed.length, icon: Check },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-border bg-card p-4 shadow-soft"
                >
                  <item.icon className="size-5 text-primary" />
                  <p className="mt-2 font-display text-2xl font-bold">{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
            <Tabs defaultValue="calendar">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <TabsList className="h-11">
                  <TabsTrigger value="calendar" className="h-9 px-5">
                    <CalendarDays />
                    Calendar
                  </TabsTrigger>
                  <TabsTrigger value="timeline" className="h-9 px-5">
                    <ListChecks />
                    Timeline
                  </TabsTrigger>
                </TabsList>
                <p className="text-xs text-muted-foreground">
                  Plans are private. Actual work appears on the timeline.
                </p>
              </div>
              <TabsContent value="calendar" className="mt-4">
                <Panel>
                  <div className="mb-5 flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Previous month"
                      onClick={() => setMonth(addMonths(month, -1))}
                    >
                      <ChevronLeft />
                    </Button>
                    <div className="text-center">
                      <h2 className="text-xl font-bold">{format(month, "MMMM yyyy")}</h2>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setMonth(startOfMonth(new Date()))}
                      >
                        Today
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Next month"
                      onClick={() => setMonth(addMonths(month, 1))}
                    >
                      <ChevronRight />
                    </Button>
                  </div>
                  <div className="hidden md:block">
                    <div className="grid grid-cols-7 border-l border-t border-border">
                      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                        <div
                          key={day}
                          className="border-b border-r border-border bg-secondary p-2 text-center text-xs font-bold"
                        >
                          {day}
                        </div>
                      ))}
                      {days.map((day) => {
                        const key = format(day, "yyyy-MM-dd");
                        const entries = activitiesOn(key);
                        return (
                          <div
                            key={key}
                            className={cn(
                              "min-h-36 border-b border-r border-border p-1.5",
                              !isSameMonth(day, month) && "bg-muted/50 text-muted-foreground",
                              isToday(day) && "bg-secondary",
                            )}
                          >
                            <div
                              className={cn(
                                "mb-1 grid size-7 place-items-center rounded-full text-xs font-bold",
                                isToday(day) && "bg-primary text-primary-foreground",
                              )}
                            >
                              {format(day, "d")}
                            </div>
                            <div className="space-y-1.5">
                              {entries.map((activity) => entry(activity, true))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-3 md:hidden">
                    <h3 className="text-sm font-bold">Agenda for {format(month, "MMMM")}</h3>
                    {monthActivities.length ? (
                      monthActivities.map((activity) => (
                        <div key={activity.id}>{entry(activity)}</div>
                      ))
                    ) : (
                      <Empty text="No planned work in this month." />
                    )}
                  </div>
                </Panel>
              </TabsContent>
              <TabsContent value="timeline" className="mt-4">
                <div className="space-y-6">
                  <Panel
                    title="Actual work history"
                    action={
                      <Button variant="hero" size="sm" onClick={() => logWork(null)}>
                        <Plus />
                        Log work
                      </Button>
                    }
                  >
                    {completed.length ? (
                      <ol className="relative space-y-5 border-l-2 border-accent pl-5">
                        {completed.map((activity) => {
                          const payment = (expenses.data ?? []).find(
                            (expense) => expense.activity_id === activity.id,
                          );
                          return (
                            <li key={activity.id} className="relative">
                              <span className="absolute -left-[29px] top-1 grid size-4 rounded-full bg-brand ring-4 ring-card" />
                              <div className="rounded-2xl border border-border p-4">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <div>
                                    <h3 className="font-bold">{activity.title}</h3>
                                    <p className="text-sm font-semibold text-primary">
                                      Done {fmtDate(activity.actual_date!)}
                                    </p>
                                  </div>
                                  <StateBadge state="completed" />
                                </div>
                                <p className="mt-2 text-xs text-muted-foreground">
                                  Original plan: {fmtDate(activity.planned_date)}
                                  {activity.planned_end_date
                                    ? ` – ${fmtDate(activity.planned_end_date)}`
                                    : ""}
                                </p>
                                <p className="mt-3 text-sm">{activity.actual_notes}</p>
                                {payment && (
                                  <p className="mt-3 rounded-lg bg-secondary px-3 py-2 text-sm font-semibold">
                                    Linked {payment.category.toLowerCase()} expense:{" "}
                                    {fmtLRD(payment.amount)}
                                  </p>
                                )}
                                <label className="mt-4 flex items-start gap-3 border-t border-border pt-3">
                                  <Checkbox
                                    checked={activity.approved_for_public}
                                    disabled={!selected.batch_code}
                                    onCheckedChange={async (checked) => {
                                      try {
                                        await api.cropCalendar.setActivityApproval(
                                          activity.id,
                                          checked === true,
                                        );
                                        saved();
                                        toast.success(
                                          checked
                                            ? "Approved for the linked batch"
                                            : "Removed from the public batch",
                                        );
                                      } catch (error) {
                                        toast.error((error as Error).message);
                                      }
                                    }}
                                  />
                                  <span className="text-sm">
                                    <span className="font-semibold">Approved for buyers</span>
                                    <span className="block text-xs text-muted-foreground">
                                      {selected.batch_code
                                        ? `Included on ${selected.batch_code} only when done by its harvest date.`
                                        : "Link a harvest batch in Season details to publish approved work."}
                                    </span>
                                  </span>
                                </label>
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    ) : (
                      <Empty text="No work logged yet. Use “Log work” on any planned activity." />
                    )}
                  </Panel>
                  {skipped.length > 0 && (
                    <Panel title="Skipped plans (private)">
                      <ul className="divide-y divide-border">
                        {skipped.map((activity) => (
                          <li key={activity.id} className="py-3 text-sm">
                            <div className="flex flex-wrap justify-between gap-2">
                              <span className="font-semibold">{activity.title}</span>
                              <span className="text-muted-foreground">
                                Planned {fmtDate(activity.planned_date)}
                              </span>
                            </div>
                            <p className="mt-1 text-muted-foreground">
                              {activity.skip_reason || "No reason recorded"}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </Panel>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )
      )}
      <SeasonDialog
        open={seasonOpen}
        onOpenChange={setSeasonOpen}
        season={editingSeason}
        harvests={harvests.data ?? []}
        onSaved={saved}
      />
      {selected && (
        <>
          <ActivityDialog
            open={activityOpen}
            onOpenChange={setActivityOpen}
            seasonId={selected.id}
            activity={editingActivity}
            onSaved={saved}
            onSkip={skip}
          />
          <WorkDialog
            open={workOpen}
            onOpenChange={setWorkOpen}
            season={selected}
            activity={workingActivity}
            onSaved={saved}
          />
          <SkipDialog
            open={skipOpen}
            onOpenChange={setSkipOpen}
            activity={skippingActivity}
            onSaved={saved}
          />
        </>
      )}
    </>
  );
}

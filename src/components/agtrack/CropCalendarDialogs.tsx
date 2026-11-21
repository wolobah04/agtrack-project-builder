import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { createSeasonSchedule, seasonDateError, suggestedSeasonEnd } from "@/lib/crop-calendar";
import { EXPENSE_CATEGORIES, FARM_TYPES, todayISO } from "@/lib/constants";
import type { CropActivity, CropSeason, Harvest } from "@/lib/types";

type DialogProps = { open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => void };
type SeasonForm = {
  name: string;
  crop: string;
  variety: string;
  plot: string;
  planting_date: string;
  end_date: string;
  batch_code: string;
  status: "active" | "completed";
  mode: string;
};
const emptySeason: SeasonForm = {
  name: "",
  crop: "Rice",
  variety: "",
  plot: "",
  planting_date: todayISO(),
  end_date: "",
  batch_code: "none",
  status: "active",
  mode: "template",
};

export function SeasonDialog({
  open,
  onOpenChange,
  onSaved,
  season,
  harvests,
}: DialogProps & { season: CropSeason | null; harvests: Harvest[] }) {
  const [form, setForm] = useState(emptySeason);
  const [saving, setSaving] = useState(false);
  const [endTouched, setEndTouched] = useState(false);
  useEffect(() => {
    if (!open) return;
    setEndTouched(false);
    setForm(
      season
        ? {
            name: season.name,
            crop: season.crop,
            variety: season.variety,
            plot: season.plot,
            planting_date: season.planting_date,
            end_date:
              season.end_date ?? suggestedSeasonEnd(season.crop, season.planting_date),
            batch_code: season.batch_code ?? "none",
            status: season.status,
            mode: "empty",
          }
        : {
            ...emptySeason,
            planting_date: todayISO(),
            end_date: suggestedSeasonEnd("Rice", todayISO()),
          },
    );
  }, [open, season]);
  const set = (key: keyof typeof emptySeason, value: string) =>
    setForm((old) => {
      const next = { ...old, [key]: value };
      if (!endTouched && (key === "crop" || key === "planting_date") && next.planting_date)
        next.end_date = suggestedSeasonEnd(next.crop, next.planting_date);
      return next;
    });
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.crop.trim() || !form.plot.trim()) {
      toast.error("Season name, crop, and plot are required.");
      return;
    }
    if (!form.end_date) {
      toast.error("Add an ending date for this season.");
      return;
    }
    const dateError = seasonDateError(form.planting_date, form.end_date);
    if (dateError) {
      toast.error(dateError);
      return;
    }
    setSaving(true);
    try {
      const value = {
        name: form.name.trim(),
        crop: form.crop.trim(),
        variety: form.variety.trim(),
        plot: form.plot.trim(),
        planting_date: form.planting_date,
        end_date: form.end_date,
        batch_code: form.batch_code === "none" ? null : form.batch_code,
        status: form.status,
      };
      if (season) await api.cropCalendar.updateSeason(season.id, value);
      else
        await api.cropCalendar.createSeason(
          value,
          form.mode === "template" ? createSeasonSchedule(value.crop, value.planting_date) : [],
        );
      toast.success(season ? "Season updated" : "Crop season started");
      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{season ? "Season details" : "Start a crop season"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="season-name">Season name</Label>
            <Input
              id="season-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Rice — North plot"
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="season-crop">Crop</Label>
              <Input
                id="season-crop"
                list="crop-options"
                value={form.crop}
                onChange={(e) => set("crop", e.target.value)}
                required
              />
              <datalist id="crop-options">
                {[...FARM_TYPES, "Maize", "Pepper", "Plantain", "Okra"].map((crop) => (
                  <option key={crop} value={crop} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="season-variety">Variety (optional)</Label>
              <Input
                id="season-variety"
                value={form.variety}
                onChange={(e) => set("variety", e.target.value)}
                placeholder="NERICA-L19"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="season-plot">Plot or field</Label>
              <Input
                id="season-plot"
                value={form.plot}
                onChange={(e) => set("plot", e.target.value)}
                placeholder="North plot"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="season-date">Planting date</Label>
              <Input
                id="season-date"
                type="date"
                value={form.planting_date}
                onChange={(e) => set("planting_date", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="season-end-date">Ending date</Label>
              <Input
                id="season-end-date"
                type="date"
                min={form.planting_date}
                value={form.end_date}
                onChange={(e) => {
                  setEndTouched(true);
                  set("end_date", e.target.value);
                }}
                required
              />
              <p className="text-xs text-muted-foreground">
                Expected harvest or season close. Suggested from your crop — change it any time.
              </p>
            </div>
            {!season && (
              <div className="space-y-1.5">
                <Label>Starting schedule</Label>
                <Select value={form.mode} onValueChange={(value) => set("mode", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="template">Editable crop template</SelectItem>
                    <SelectItem value="empty">Empty calendar</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Template dates are planning aids. You can reschedule or skip every activity.
                </p>
              </div>
            )}
            {season && (
              <div className="space-y-1.5">
                <Label>Season status</Label>
                <Select value={form.status} onValueChange={(value) => set("status", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Linked harvest batch (optional)</Label>
            <Select value={form.batch_code} onValueChange={(value) => set("batch_code", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not linked yet</SelectItem>
                {harvests.map((harvest) => (
                  <SelectItem key={harvest.id} value={harvest.batch_code}>
                    {harvest.batch_code} · {harvest.crop} · {harvest.date}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Only approved work from this season can appear on the linked batch passport.
            </p>
          </div>
          <Button type="submit" variant="hero" className="w-full" disabled={saving}>
            {saving && <Loader2 className="animate-spin" />}
            {season ? "Save season" : "Start season"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const emptyActivity = {
  title: "",
  planned_date: todayISO(),
  planned_end_date: "",
  notes: "",
  recurrence_days: "none",
};
export function ActivityDialog({
  open,
  onOpenChange,
  onSaved,
  seasonId,
  activity,
  onSkip,
}: DialogProps & {
  seasonId: string;
  activity: CropActivity | null;
  onSkip: (activity: CropActivity) => void;
}) {
  const [form, setForm] = useState(emptyActivity);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open)
      setForm(
        activity
          ? {
              title: activity.title,
              planned_date: activity.planned_date,
              planned_end_date: activity.planned_end_date ?? "",
              notes: activity.notes,
              recurrence_days: activity.recurrence_days ? String(activity.recurrence_days) : "none",
            }
          : { ...emptyActivity, planned_date: todayISO() },
      );
  }, [open, activity]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) {
      toast.error("Activity name is required.");
      return;
    }
    setSaving(true);
    try {
      const value = {
        title: form.title.trim(),
        planned_date: form.planned_date,
        planned_end_date: form.planned_end_date || null,
        notes: form.notes.trim(),
        recurrence_days: form.recurrence_days === "none" ? null : Number(form.recurrence_days),
      };
      if (activity) await api.cropCalendar.updateActivity(activity.id, value);
      else await api.cropCalendar.createActivity({ ...value, season_id: seasonId });
      toast.success(activity ? "Activity rescheduled" : "Activity planned");
      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{activity ? "Edit planned activity" : "Plan an activity"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="activity-title">Activity</Label>
            <Input
              id="activity-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Field check"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="activity-start">Planned date</Label>
              <Input
                id="activity-start"
                type="date"
                value={form.planned_date}
                onChange={(e) => setForm({ ...form, planned_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="activity-end">Window ends</Label>
              <Input
                id="activity-end"
                type="date"
                min={form.planned_date}
                value={form.planned_end_date}
                onChange={(e) => setForm({ ...form, planned_end_date: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Repeat</Label>
            <Select
              value={form.recurrence_days}
              onValueChange={(value) => setForm({ ...form, recurrence_days: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Does not repeat</SelectItem>
                <SelectItem value="7">Every week after logging or skipping</SelectItem>
                <SelectItem value="14">Every two weeks after logging or skipping</SelectItem>
                <SelectItem value="30">Every 30 days after logging or skipping</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="activity-notes">Planning note</Label>
            <Textarea
              id="activity-notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Variety, plot, labor, or local conditions"
            />
          </div>
          <Button type="submit" variant="hero" className="w-full" disabled={saving}>
            {saving && <Loader2 className="animate-spin" />}Save activity
          </Button>
          {activity && (
            <Button
              type="button"
              variant="outline"
              className="w-full text-destructive"
              onClick={() => {
                onOpenChange(false);
                onSkip(activity);
              }}
            >
              Skip this activity
            </Button>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function WorkDialog({
  open,
  onOpenChange,
  onSaved,
  season,
  activity,
}: DialogProps & { season: CropSeason; activity: CropActivity | null }) {
  const [form, setForm] = useState({
    title: "",
    actual_date: todayISO(),
    actual_notes: "",
    approved_for_public: false,
    payment: false,
    category: "Labor",
    amount: "",
  });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open)
      setForm({
        title: activity?.title ?? "",
        actual_date: todayISO(),
        actual_notes: "",
        approved_for_public: false,
        payment: false,
        category: "Labor",
        amount: "",
      });
  }, [open, activity]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.actual_notes.trim() || (!activity && !form.title.trim())) {
      toast.error("Describe the work that actually happened.");
      return;
    }
    if (form.payment && (!form.amount || Number(form.amount) <= 0)) {
      toast.error("Enter the payment amount above 0.");
      return;
    }
    setSaving(true);
    try {
      const planned =
        activity ??
        (await api.cropCalendar.createActivity({
          season_id: season.id,
          title: form.title.trim(),
          planned_date: form.actual_date,
          planned_end_date: null,
          notes: "Unplanned work",
          recurrence_days: null,
        }));
      await api.cropCalendar.completeActivity(planned.id, {
        actual_date: form.actual_date,
        actual_notes: form.actual_notes.trim(),
        approved_for_public: form.approved_for_public && !!season.batch_code,
        ...(form.payment
          ? { expense: { category: form.category, amount: Number(form.amount) } }
          : {}),
      });
      toast.success(form.payment ? "Work and linked expense saved" : "Work logged on the timeline");
      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {activity ? `Log work: ${activity.title}` : "Log unplanned work"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <p className="rounded-xl bg-secondary p-3 text-sm text-secondary-foreground">
            {season.crop} · {season.name}
            {activity && ` · Planned ${activity.planned_date}`}
          </p>
          {!activity && (
            <div className="space-y-1.5">
              <Label htmlFor="work-title">Work done</Label>
              <Input
                id="work-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Scouting, repairs, extra weeding…"
                required
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="work-date">Actual work date</Label>
            <Input
              id="work-date"
              type="date"
              value={form.actual_date}
              onChange={(e) => setForm({ ...form, actual_date: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="work-notes">What actually happened?</Label>
            <Textarea
              id="work-notes"
              value={form.actual_notes}
              onChange={(e) => setForm({ ...form, actual_notes: e.target.value })}
              placeholder="Work completed, field observations, labor, or materials used"
              required
            />
          </div>
          <label className="flex items-start gap-3 rounded-xl border border-border p-3">
            <Checkbox
              checked={form.payment}
              onCheckedChange={(checked) => setForm({ ...form, payment: checked === true })}
            />
            <span>
              <span className="block text-sm font-semibold">Add a purchase or labor payment</span>
              <span className="text-xs text-muted-foreground">
                Creates one expense linked to this activity and season.
              </span>
            </span>
          </label>
          {form.payment && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Expense category</Label>
                <Select
                  value={form.category}
                  onValueChange={(value) => setForm({ ...form, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="work-amount">Amount (LRD)</Label>
                <Input
                  id="work-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                />
              </div>
            </div>
          )}
          <label className="flex items-start gap-3 rounded-xl border border-border p-3">
            <Checkbox
              disabled={!season.batch_code}
              checked={form.approved_for_public && !!season.batch_code}
              onCheckedChange={(checked) =>
                setForm({ ...form, approved_for_public: checked === true })
              }
            />
            <span>
              <span className="block text-sm font-semibold">
                Approve for the public batch passport
              </span>
              <span className="text-xs text-muted-foreground">
                {season.batch_code
                  ? `Visible on ${season.batch_code} only when the actual date is on or before its harvest date.`
                  : "Link a harvest batch in Season details first."}
              </span>
            </span>
          </label>
          <Button type="submit" variant="hero" className="w-full" disabled={saving}>
            {saving && <Loader2 className="animate-spin" />}Save actual work
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SkipDialog({
  open,
  onOpenChange,
  onSaved,
  activity,
}: DialogProps & { activity: CropActivity | null }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) setReason("");
  }, [open]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activity) return;
    setSaving(true);
    try {
      await api.cropCalendar.skipActivity(activity.id, reason.trim());
      toast.success("Activity skipped and kept private");
      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Skip {activity?.title ?? "activity"}?</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The original planned date stays in your private history. Skipped work never appears on a
            batch passport.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="skip-reason">Reason (optional)</Label>
            <Textarea
              id="skip-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Heavy rain, no labor available, crop condition…"
            />
          </div>
          <Button type="submit" variant="destructive" className="w-full" disabled={saving}>
            {saving && <Loader2 className="animate-spin" />}Skip planned activity
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

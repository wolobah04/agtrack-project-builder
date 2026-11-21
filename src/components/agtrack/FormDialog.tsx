import { useEffect, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type Field = { name: string; label: string; type?: "text" | "number" | "date" | "select"; options?: string[]; required?: boolean };
type Values = Record<string, string>;

export function FormDialog({ open, onOpenChange, title, fields, initial, onSubmit }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; fields: Field[]; initial: Values; onSubmit: (v: Values) => Promise<unknown> }) {
  const [v, setV] = useState<Values>(initial); const [err, setErr] = useState<Values>({}); const [loading, setLoading] = useState(false);
  useEffect(() => { if (open) { setV(initial); setErr({}); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); const er: Values = {};
    fields.forEach((f) => {
      const x = (v[f.name] ?? "").trim();
      if (f.required !== false && !x) er[f.name] = "Required";
      else if (f.type === "number" && x && (isNaN(+x) || +x <= 0)) er[f.name] = "Enter a number above 0";
      else if (x.length > 200) er[f.name] = "Too long";
    });
    setErr(er); if (Object.keys(er).length) return;
    setLoading(true);
    try { await onSubmit(v); toast.success("Saved"); onOpenChange(false); } catch (x) { toast.error((x as Error).message); } finally { setLoading(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto rounded-3xl p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-border px-6 py-5"><DialogTitle className="text-xl font-bold">{title}</DialogTitle></DialogHeader>
        <form onSubmit={submit} noValidate><div className="grid gap-x-4 gap-y-5 px-6 py-6 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.name} className={`space-y-2 ${f.type === "date" || f.name === "description" || f.name === "note" ? "sm:col-span-2" : ""}`}>
              <Label htmlFor={f.name}>{f.label}</Label>
              {f.type === "select" ? (
                <Select value={v[f.name] ?? ""} onValueChange={(x) => setV({ ...v, [f.name]: x })}><SelectTrigger id={f.name} className="h-11"><SelectValue placeholder="Choose" /></SelectTrigger>
                  <SelectContent>{f.options!.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
              ) : <Input id={f.name} type={f.type ?? "text"} inputMode={f.type === "number" ? "decimal" : undefined} className="h-11" value={v[f.name] ?? ""} onChange={(e) => setV({ ...v, [f.name]: e.target.value })} />}
              {err[f.name] && <p className="text-xs text-destructive">{err[f.name]}</p>}
            </div>
          ))}
          </div><div className="flex justify-end gap-3 border-t border-border px-6 py-4"><Button type="button" variant="ghost" className="rounded-full" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" variant="hero" className="rounded-full px-6" disabled={loading}>{loading && <Loader2 className="animate-spin" />}Save</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export function useDialog<T = null>() { const [state, set] = useState<{ open: boolean; item: T | null }>({ open: false, item: null }); return { ...state, show: (item: T | null = null) => set({ open: true, item }), setOpen: (o: boolean) => set((s) => ({ ...s, open: o })) }; }
export type { ReactNode };

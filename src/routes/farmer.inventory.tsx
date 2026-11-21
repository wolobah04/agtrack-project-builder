import { createFileRoute } from "@tanstack/react-router";
import { Plus, Pencil, Trash2, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { PageHeader, Panel } from "@/components/agtrack/ui";
import { RecordTable } from "@/components/agtrack/RecordTable";
import { FormDialog, useDialog } from "@/components/agtrack/FormDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useInvalidate, useRecords } from "@/hooks/use-farm-data";
import { api } from "@/lib/api";
import { fmtDate, fmtLRD } from "@/lib/constants";
import { d0, expenseFields, stockFields, toExpense, toStock } from "@/lib/forms";
import type { Expense } from "@/lib/types";

export const Route = createFileRoute("/farmer/inventory")({ component: Inventory });

function Inventory() {
  const stock = useRecords("inventory"); const exp = useRecords("expenses"); const inv = useInvalidate();
  const sd = useDialog(); const ed = useDialog<Expense>();
  const levels = Object.entries((stock.data ?? []).reduce<Record<string, { q: number; u: string }>>((a, t) => { const e = (a[t.item] ??= { q: 0, u: t.unit }); e.q += t.type === "in" ? t.quantity : -t.quantity; return a; }, {}));
  const cats = Object.entries((exp.data ?? []).reduce<Record<string, number>>((a, e) => ({ ...a, [e.category]: (a[e.category] ?? 0) + e.amount }), {})).sort((a, b) => b[1] - a[1]);
  const total = cats.reduce((s, [, v]) => s + v, 0);
  return (
    <>
      <PageHeader title="Inventory" subtitle="Your stock and farm expenses" />
      <Tabs defaultValue="stock">
        <TabsList className="mb-4 h-11"><TabsTrigger value="stock" className="px-5">Stock</TabsTrigger><TabsTrigger value="expenses" className="px-5">Expenses</TabsTrigger></TabsList>
        <TabsContent value="stock" className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{levels.map(([item, { q, u }]) => <div key={item} className="rounded-2xl border border-border bg-card p-4 shadow-soft"><p className="text-sm text-muted-foreground">{item}</p><p className="font-display text-2xl font-bold">{q} <span className="text-sm font-normal">{u}</span></p></div>)}</div>
          <Panel title="Stock movements" action={<Button size="sm" onClick={() => sd.show()}><Plus />Add</Button>}>
            <RecordTable rows={stock.data} loading={stock.isLoading} error={stock.isError} empty="No stock recorded yet." cols={[
              { h: "Date", c: (r) => fmtDate(r.date) }, { h: "Item", c: (r) => r.item },
              { h: "Type", c: (r) => r.type === "in" ? <span className="inline-flex items-center gap-1 font-semibold text-primary"><ArrowDownLeft className="size-4" />In</span> : <span className="inline-flex items-center gap-1 font-semibold text-warning"><ArrowUpRight className="size-4" />Out</span> },
              { h: "Quantity", c: (r) => `${r.quantity} ${r.unit}`, right: true }]} />
          </Panel>
        </TabsContent>
        <TabsContent value="expenses" className="space-y-6">
          <Panel title={`Totals by category · ${fmtLRD(total)}`}>
            <div className="space-y-3">{cats.map(([c, v]) => <div key={c}><div className="flex justify-between text-sm"><span className="font-semibold">{c}</span><span>{fmtLRD(v)}</span></div><div className="mt-1 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-brand" style={{ width: `${(v / total) * 100}%` }} /></div></div>)}</div>
          </Panel>
          <Panel title="All expenses" action={<Button size="sm" onClick={() => ed.show()}><Plus />Add</Button>}>
            <RecordTable rows={exp.data} loading={exp.isLoading} error={exp.isError} empty="No expenses yet." cols={[
              { h: "Date", c: (r) => fmtDate(r.date) }, { h: "Category", c: (r) => r.category }, { h: "Note", c: (r) => r.description }, { h: "Amount", c: (r) => fmtLRD(r.amount), right: true },
              { h: "", right: true, c: (r) => <div className="flex justify-end gap-1"><Button size="icon" variant="ghost" aria-label="Edit" onClick={() => ed.show(r)}><Pencil /></Button>
                <Button size="icon" variant="ghost" aria-label="Delete" onClick={async () => { if (confirm("Delete this expense?")) { await api.expenses.remove(r.id); inv("expenses"); } }}><Trash2 /></Button></div> }]} />
          </Panel>
        </TabsContent>
      </Tabs>
      <FormDialog open={sd.open} onOpenChange={sd.setOpen} title="Add stock movement" fields={stockFields} initial={{ ...d0(), type: "in", unit: "kg" }} onSubmit={async (v) => { await api.inventory.create(toStock(v)); inv("inventory"); }} />
      <FormDialog open={ed.open} onOpenChange={ed.setOpen} title={ed.item ? "Edit expense" : "Add expense"} fields={expenseFields}
        initial={ed.item ? { category: ed.item.category, amount: String(ed.item.amount), description: ed.item.description, date: ed.item.date } : d0()}
        onSubmit={async (v) => { ed.item ? await api.expenses.update(ed.item.id, toExpense(v)) : await api.expenses.create(toExpense(v)); inv("expenses"); }} />
    </>
  );
}

import type { ReactNode } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Empty, ErrorState, Loading } from "./ui";
export function RecordTable<T extends { id: string }>({ rows, cols, loading, error, empty }: { rows: T[] | undefined; cols: { h: string; c: (r: T) => ReactNode; right?: boolean }[]; loading?: boolean; error?: boolean; empty: string }) {
  if (loading) return <Loading />; if (error) return <ErrorState />; if (!rows?.length) return <Empty text={empty} />;
  return (
    <div className="overflow-x-auto"><Table><TableHeader><TableRow>{cols.map((c) => <TableHead key={c.h} className={c.right ? "text-right" : ""}>{c.h}</TableHead>)}</TableRow></TableHeader>
      <TableBody>{rows.map((r) => <TableRow key={r.id}>{cols.map((c) => <TableCell key={c.h} className={c.right ? "text-right" : ""}>{c.c(r)}</TableCell>)}</TableRow>)}</TableBody></Table></div>
  );
}

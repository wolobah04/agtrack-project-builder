import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import { LogOut, Menu, Settings, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { clearSession } from "@/lib/auth";
import { USE_MOCK } from "@/lib/api";
import { cn } from "@/lib/utils";

export interface NavItem { to: string; label: string; icon: LucideIcon; exact?: boolean }

export function DashboardShell({ nav, settingsTo, topbar, children }: { nav: NavItem[]; settingsTo: string; topbar: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate(); const qc = useQueryClient();
  const signOut = async () => { await qc.cancelQueries(); qc.clear(); clearSession(); navigate({ to: "/login", replace: true }); };
  const active = (i: NavItem) => (i.exact ? path === i.to || path === i.to + "/" : path.startsWith(i.to));
  const item = (i: NavItem) => (
    <Link key={i.to} to={i.to} onClick={() => setOpen(false)}
      className={cn("flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors",
        active(i) ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/85 hover:bg-sidebar-accent")}>
      <i.icon className="size-5 shrink-0" />{i.label}
    </Link>
  );
  const side = (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="flex items-center justify-between"><div className="rounded-xl bg-card px-3 py-2"><Logo /></div>
        <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X /></Button></div>
      <nav className="flex flex-1 flex-col gap-1">{nav.map(item)}</nav>
      <div className="flex flex-col gap-1 border-t border-sidebar-border pt-4">
        {item({ to: settingsTo, label: "Settings", icon: Settings })}
        <button onClick={signOut} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-sidebar-foreground/85 hover:bg-sidebar-accent"><LogOut className="size-5" />Sign Out</button>
      </div>
    </div>
  );
  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 bg-sidebar lg:block">{side}</aside>
      {open && <div className="fixed inset-0 z-50 lg:hidden"><div className="absolute inset-0 bg-foreground/40" onClick={() => setOpen(false)} /><aside className="relative h-full w-72 bg-sidebar">{side}</aside></div>}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu /></Button>
          <div className="flex min-w-0 flex-1 items-center gap-3">{topbar}</div>
        </header>
        {USE_MOCK && <div className="bg-secondary px-4 py-1.5 text-center text-xs font-semibold text-secondary-foreground">Demo mode: showing sample data (no backend connected)</div>}
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

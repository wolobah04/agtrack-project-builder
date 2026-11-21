import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronRight, LoaderCircle, Search, Wheat } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { searchHarvestBatches } from "@/lib/batch-search";
import { searchUsers } from "@/lib/user-search";
import type { Harvest, User } from "@/lib/types";

const roleLabels = { farmer: "Farmer", agent: "Field agent", admin: "Ministry admin" } as const;

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase() || "?";
}

export function MinistrySearch({ users, harvests, loading, error }: { users: User[]; harvests: Harvest[]; loading: boolean; error: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const userResults = useMemo(() => searchUsers(users, query), [users, query]);
  const batchResults = useMemo(() => searchHarvestBatches(harvests, users, query), [harvests, users, query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.isContentEditable || target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT";
      if ((event.key === "/" && !isTyping) || ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "k")) {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const changeOpen = (next: boolean) => {
    setOpen(next);
    if (next) setQuery("");
  };

  const openAccount = (user: User) => {
    setOpen(false);
    navigate({ to: "/admin/management", search: { role: user.role, q: user.name } });
  };

  const openBatch = (code: string) => {
    setOpen(false);
    navigate({ to: "/trace/$code", params: { code } });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => changeOpen(true)}
        className="flex h-11 w-full min-w-0 items-center gap-2 rounded-full border border-border bg-muted/70 px-4 text-left text-sm text-muted-foreground shadow-sm transition-colors hover:border-primary/40 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Search Ministry users and harvest batches"
      >
        <Search className="size-4 shrink-0 text-primary" />
        <span className="min-w-0 flex-1 truncate">Search users or batch codes…</span>
        <kbd className="hidden rounded-md border border-border bg-card px-2 py-0.5 font-sans text-[10px] font-semibold text-muted-foreground sm:inline-flex">Ctrl K</kbd>
      </button>

      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent className="overflow-hidden rounded-3xl border-border p-0 shadow-soft sm:max-w-xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Search Ministry users and harvest batches</DialogTitle>
            <DialogDescription>Find a user account to manage it, or a harvest batch to open its buyer traceability history.</DialogDescription>
          </DialogHeader>
          <Command shouldFilter={false} className="rounded-3xl">
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder="Name, phone, county, role, or batch code…"
              className="h-14 pr-10 text-base"
              aria-label="Search users and harvest batches"
            />
            <CommandList className="max-h-[min(26rem,60vh)] p-2">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />Loading Ministry records…</div>
              ) : error ? (
                <p className="py-12 text-center text-sm text-destructive">Search records could not be loaded. Please try again.</p>
              ) : !query.trim() ? (
                <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                  <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary"><Search className="size-6" /></span>
                  <div><p className="font-semibold">Search Ministry records</p><p className="mt-1 text-sm text-muted-foreground">Find user accounts and harvest batch histories.</p></div>
                </div>
              ) : (
                <>
                  <CommandEmpty className="py-12 text-muted-foreground">No users or batches match “{query}”.</CommandEmpty>
                  {userResults.length > 0 && (
                    <CommandGroup heading={`${userResults.length} ${userResults.length === 1 ? "account" : "accounts"} found`} className="p-1">
                      {userResults.map((user) => (
                        <CommandItem
                          key={user.id}
                          value={`user-${user.id}`}
                          onSelect={() => openAccount(user)}
                          className="cursor-pointer gap-3 rounded-2xl px-3 py-3 data-[selected=true]:bg-secondary"
                        >
                          <Avatar className="size-10 border border-border">
                            <AvatarFallback className="bg-secondary text-xs font-bold text-secondary-foreground">{initials(user.name)}</AvatarFallback>
                          </Avatar>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="truncate font-semibold text-foreground">{user.name}</span>
                              <Badge variant="secondary" className="rounded-full px-2 py-0 text-[10px]">{roleLabels[user.role]}</Badge>
                              {!user.active && <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px]">Deactivated</Badge>}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">{user.phone} · {user.county}</span>
                          </span>
                          <ChevronRight className="size-4 text-muted-foreground" />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  {batchResults.length > 0 && (
                    <CommandGroup heading={`${batchResults.length} ${batchResults.length === 1 ? "batch" : "batches"} found`} className="p-1">
                      {batchResults.map(({ harvest, farmer }) => (
                        <CommandItem
                          key={harvest.id}
                          value={`batch-${harvest.id}`}
                          onSelect={() => openBatch(harvest.batch_code)}
                          className="cursor-pointer gap-3 rounded-2xl px-3 py-3 data-[selected=true]:bg-secondary"
                        >
                          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><Wheat className="size-5" /></span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="truncate font-semibold text-foreground">{harvest.batch_code}</span>
                              <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px]">Batch history</Badge>
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">{harvest.crop} · {harvest.quantity_kg.toLocaleString()} kg · {farmer?.name ?? "Unknown farmer"}</span>
                          </span>
                          <ChevronRight className="size-4 text-muted-foreground" />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </>
              )}
            </CommandList>
            <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/40 px-4 py-2.5 text-[11px] text-muted-foreground">
              <span>Open an account or buyer batch history</span>
              <span className="hidden items-center gap-1.5 sm:flex"><kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-sans">↑↓</kbd> navigate <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-sans">Enter</kbd> open</span>
            </div>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}

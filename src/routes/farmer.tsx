import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { LayoutDashboard, Boxes, CloudSun, MessageCircle, TrendingDown, Award, FileBarChart, QrCode, UserCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { DashboardShell } from "@/components/agtrack/DashboardShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { requireRole } from "@/lib/guard";
import { useSession } from "@/hooks/use-session";
import { useRecords } from "@/hooks/use-farm-data";
import { publicBatchUrl } from "@/lib/public-links";

export const Route = createFileRoute("/farmer")({
  ssr: false,
  beforeLoad: () => requireRole("farmer"),
  head: () => ({ meta: [{ title: "Farmer dashboard — AgTrack" }, { name: "robots", content: "noindex" }] }),
  component: FarmerLayout,
});

const nav = [
  { to: "/farmer", label: "Overview", icon: LayoutDashboard, exact: true }, { to: "/farmer/inventory", label: "Inventory", icon: Boxes },
  { to: "/farmer/weather", label: "Weather", icon: CloudSun }, { to: "/farmer/chat", label: "Chat", icon: MessageCircle },
  { to: "/farmer/losses", label: "Loss Record", icon: TrendingDown }, { to: "/farmer/score", label: "Score", icon: Award },
  { to: "/farmer/reports", label: "Reports", icon: FileBarChart },
];

function QrButton() {
  const { data } = useRecords("harvests");
  const latest = data?.[0];
  const url = latest ? publicBatchUrl(latest.batch_code) : "";
  return (
    <Dialog>
      <DialogTrigger asChild><Button variant="outline" size="icon" aria-label="Show QR code"><QrCode /></Button></DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Latest batch QR</DialogTitle></DialogHeader>
        {latest ? <div className="flex flex-col items-center gap-3"><div className="rounded-2xl bg-card p-4"><QRCodeSVG value={url} size={200} fgColor="currentColor" className="text-sidebar" /></div><p className="font-bold">{latest.batch_code}</p><p className="text-center text-sm text-muted-foreground">Buyers can scan this to see the public batch history without signing in. Print it on your bag label.</p><a href={url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary underline">Open buyer history</a></div>
          : <p className="text-sm text-muted-foreground">Log a harvest first to get a QR code.</p>}
      </DialogContent>
    </Dialog>
  );
}

function FarmerLayout() {
  const s = useSession();
  return (
    <DashboardShell nav={nav} settingsTo="/farmer/settings" topbar={<>
      <p className="min-w-0 flex-1 truncate font-display text-lg font-bold">Welcome, {s?.user.name.split(" ")[0] ?? ""}</p>
      <QrButton />
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="ghost" className="gap-2 px-2"><UserCircle className="size-6" /><span className="hidden sm:inline">Profile</span></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end"><DropdownMenuLabel>{s?.user.name}<p className="text-xs font-normal text-muted-foreground">{s?.user.county} · {s?.user.farm_type}</p></DropdownMenuLabel><DropdownMenuSeparator />
          <DropdownMenuItem asChild><Link to="/farmer/settings">Settings</Link></DropdownMenuItem></DropdownMenuContent>
      </DropdownMenu>
    </>}>
      <Outlet />
    </DashboardShell>
  );
}

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "./ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from "@/hooks/use-session";
import { api, USE_MOCK } from "@/lib/api";
import { updateSessionUser } from "@/lib/auth";
import { COUNTY_NAMES, FARM_TYPES } from "@/lib/constants";
import { resetMock } from "@/lib/mock-db";

export function SettingsView({ farm = true }: { farm?: boolean }) {
  const s = useSession(); const [p, setP] = useState({ name: "", county: "", farm_type: "" }); const [pw, setPw] = useState({ cur: "", next: "" }); const [busy, setBusy] = useState("");
  useEffect(() => { if (s) setP({ name: s.user.name, county: s.user.county, farm_type: s.user.farm_type }); }, [s]);
  const save = async () => { if (p.name.trim().length < 2) { toast.error("Enter your name"); return; } setBusy("p"); try { updateSessionUser(await api.auth.updateMe({ ...p, name: p.name.trim() })); toast.success("Profile saved"); } catch (x) { toast.error((x as Error).message); } setBusy(""); };
  const change = async () => { if (pw.next.length < 6) { toast.error("New password needs 6+ characters"); return; } setBusy("w"); try { await api.auth.changePassword(pw.cur, pw.next); setPw({ cur: "", next: "" }); toast.success("Password changed"); } catch (x) { toast.error((x as Error).message); } setBusy(""); };
  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title={farm ? "Profile & farm" : "Account"}><div className="space-y-4">
          <div className="space-y-1.5"><Label>Phone number</Label><Input value={s?.user.phone ?? ""} disabled className="h-11" /></div>
          <div className="space-y-1.5"><Label htmlFor="n">Name</Label><Input id="n" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} className="h-11" maxLength={80} /></div>
          {farm && <><div className="space-y-1.5"><Label>County</Label><Select value={p.county} onValueChange={(v) => setP({ ...p, county: v })}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent>{COUNTY_NAMES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label>Farm type</Label><Select value={p.farm_type} onValueChange={(v) => setP({ ...p, farm_type: v })}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent>{FARM_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div></>}
          <Button onClick={save} disabled={busy === "p"}>{busy === "p" && <Loader2 className="animate-spin" />}Save</Button></div></Panel>
        <Panel title="Change password"><div className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="c">Current password</Label><Input id="c" type="password" value={pw.cur} onChange={(e) => setPw({ ...pw, cur: e.target.value })} className="h-11" /></div>
          <div className="space-y-1.5"><Label htmlFor="w">New password</Label><Input id="w" type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} className="h-11" /></div>
          <Button onClick={change} disabled={busy === "w"}>{busy === "w" && <Loader2 className="animate-spin" />}Change password</Button></div>
          {USE_MOCK && <Button variant="ghost" size="sm" className="mt-6 text-muted-foreground" onClick={() => { resetMock(); toast.success("Sample data reset"); location.reload(); }}>Reset sample data</Button>}
        </Panel>
      </div>
    </>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Send, Sprout, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/agtrack/ui";
import { useSession } from "@/hooks/use-session";
import { useRecords } from "@/hooks/use-farm-data";
import { answer } from "@/lib/assistant";
import { cn } from "@/lib/utils";
import { appwriteChat, USE_APPWRITE } from "@/lib/appwrite";
import { toast } from "sonner";

export const Route = createFileRoute("/farmer/chat")({ component: Chat });
type Msg = { role: "user" | "bot"; text: string };
const suggestions = ["Should I plant rice this week?", "Best day to spray?", "How much stock do I have?", "What are my biggest losses?"];
function Chat() {
  const s = useSession(); const stock = useRecords("inventory"), exp = useRecords("expenses"), loss = useRecords("losses");
  const key = `agtrack-chat-${s?.user.id}`; const [msgs, setMsgs] = useState<Msg[]>([]); const [text, setText] = useState(""); const [typing, setTyping] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!s) return;
    if (USE_APPWRITE) appwriteChat.list().then(setMsgs).catch((x) => toast.error((x as Error).message));
    else setMsgs(JSON.parse(localStorage.getItem(key) ?? "[]"));
  }, [s, key]);
  useEffect(() => { if (s && !USE_APPWRITE) localStorage.setItem(key, JSON.stringify(msgs.slice(-50))); end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, s, key]);
  const send = async (q: string) => {
    if (!q.trim() || typing || !s) return; setText(""); setMsgs((m) => [...m, { role: "user", text: q.trim() }]); setTyping(true);
    try {
      if (USE_APPWRITE) await appwriteChat.add("user", q.trim());
      const a = await answer(q, { county: s.user.county, stock: stock.data ?? [], expenses: exp.data ?? [], losses: loss.data ?? [] });
      if (USE_APPWRITE) await appwriteChat.add("bot", a);
      setMsgs((m) => [...m, { role: "bot", text: a }]);
    } catch (x) { toast.error((x as Error).message); } finally { setTyping(false); }
  };
  return (
    <>
      <PageHeader title="Farm Assistant" subtitle="Ask about weather, your stock, costs or crops" action={msgs.length ? <Button variant="ghost" size="sm" onClick={async () => { if (USE_APPWRITE) await appwriteChat.clear(); setMsgs([]); }}><Trash2 />Clear</Button> : undefined} />
      <div className="flex h-[calc(100vh-15rem)] min-h-96 flex-col rounded-2xl border border-border bg-card shadow-soft">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {!msgs.length && <div className="flex flex-col items-center gap-4 py-8 text-center"><span className="grid size-14 place-items-center rounded-2xl bg-brand text-accent-foreground"><Sprout /></span><p className="text-muted-foreground">Hi! How can I help your farm today?</p>
            <div className="flex flex-wrap justify-center gap-2">{suggestions.map((x) => <button key={x} onClick={() => send(x)} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary">{x}</button>)}</div></div>}
          {msgs.map((m, i) => <div key={i} className={cn("max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm", m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted")}>{m.text}</div>)}
          {typing && <div className="flex w-16 gap-1 rounded-2xl bg-muted px-4 py-3">{[0, 1, 2].map((i) => <span key={i} className="size-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: `${i * 0.15}s` }} />)}</div>}
          <div ref={end} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex gap-2 border-t border-border p-3">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your question…" className="h-12" maxLength={500} aria-label="Message" />
          <Button type="submit" size="icon" className="size-12" disabled={typing} aria-label="Send"><Send /></Button>
        </form>
      </div>
    </>
  );
}

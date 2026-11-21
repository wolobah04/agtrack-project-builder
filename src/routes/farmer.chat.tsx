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
import { appwriteAssistant, appwriteChat, USE_APPWRITE } from "@/lib/appwrite";
import { toast } from "sonner";

export const Route = createFileRoute("/farmer/chat")({
  head: () => ({ meta: [
    { title: "AI Farm Assistant — AgTrack" },
    { name: "description", content: "Ask AgTrack's AI farm assistant about live county weather, watering, crops, stock, costs and losses." },
    { property: "og:title", content: "AI Farm Assistant — AgTrack" },
    { property: "og:description", content: "Practical farm answers grounded in live Open-Meteo weather and your own AgTrack records." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: Chat,
});
type Msg = { role: "user" | "bot"; text: string };
const suggestions = ["What is today's rain probability? Can I water my crops?", "Should I plant rice this week?", "Best day to spray?", "How much stock do I have?"];
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
    const question = q.trim();
    if (!question || typing || !s) return;
    const history = msgs.slice(-12);
    setText(""); setMsgs((m) => [...m, { role: "user", text: question }]); setTyping(true);
    try {
      let a: string;
      if (USE_APPWRITE) {
        await appwriteChat.add("user", question);
        const result = await appwriteAssistant.ask(question, history);
        a = result.reply;
        await appwriteChat.add("bot", a);
      } else {
        a = await answer(question, { county: s.user.county, stock: stock.data ?? [], expenses: exp.data ?? [], losses: loss.data ?? [] });
      }
      setMsgs((m) => [...m, { role: "bot", text: a }]);
    } catch (x) { toast.error((x as Error).message); } finally { setTyping(false); }
  };
  return (
    <>
      <PageHeader title="Farm Assistant" subtitle={USE_APPWRITE ? "AI answers using live Open-Meteo weather and your farm records" : "Ask about weather, your stock, costs or crops"} action={msgs.length ? <Button variant="ghost" size="sm" onClick={async () => { if (USE_APPWRITE) await appwriteChat.clear(); setMsgs([]); }}><Trash2 />Clear</Button> : undefined} />
      <div className="flex h-[calc(100vh-15rem)] min-h-96 flex-col rounded-2xl border border-border bg-card shadow-soft">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {!msgs.length && <div className="flex flex-col items-center gap-4 py-8 text-center"><span className="grid size-14 place-items-center rounded-2xl bg-brand text-accent-foreground"><Sprout /></span><p className="max-w-md text-muted-foreground">Hi! Ask about rain, watering, planting, stock or costs. I’ll use live weather and your farm records.</p>
            <div className="flex flex-wrap justify-center gap-2">{suggestions.map((x) => <button key={x} onClick={() => send(x)} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary">{x}</button>)}</div></div>}
          {msgs.map((m, i) => <div key={i} className={cn("max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm", m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted")}>{m.text}</div>)}
          {typing && <div className="flex max-w-[85%] items-center gap-3 rounded-2xl bg-muted px-4 py-3"><div className="flex gap-1">{[0, 1, 2].map((i) => <span key={i} className="size-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: `${i * 0.15}s` }} />)}</div><span className="text-xs text-muted-foreground">Checking live weather and farm records…</span></div>}
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

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Mic, Send, Sprout, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/agtrack/ui";
import { useSession } from "@/hooks/use-session";
import { useFarmScore } from "@/hooks/use-score";
import { useSpeechToText } from "@/hooks/use-speech-to-text";
import { answer } from "@/lib/assistant";
import { cn } from "@/lib/utils";
import { formatRecordingTime, MAX_RECORDING_SECONDS } from "@/lib/speech";
import { appwriteAssistant, appwriteChat, USE_APPWRITE } from "@/lib/appwrite";
import { toast } from "sonner";

export const Route = createFileRoute("/farmer/chat")({
  head: () => ({ meta: [
    { title: "AI Farm Assistant — AgTrack" },
    { name: "description", content: "Ask AgTrack's AI farm assistant by voice or text about live county weather, watering, crops, stock, costs, losses and your real quality score." },
    { property: "og:title", content: "AI Farm Assistant — AgTrack" },
    { property: "og:description", content: "Practical farm answers grounded in live Open-Meteo weather and your own AgTrack records." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: Chat,
});
type Msg = { role: "user" | "bot"; text: string };
const suggestions = ["What is my quality score and how can I improve it?", "What is today's rain probability? Can I water my crops?", "Should I plant rice this week?", "Best day to spray?", "How much stock do I have?"];
function Chat() {
  const s = useSession(); const farm = useFarmScore();
  const key = `agtrack-chat-${s?.user.id}`; const [msgs, setMsgs] = useState<Msg[]>([]); const [text, setText] = useState(""); const [typing, setTyping] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const speech = useSpeechToText((transcript) => send(transcript, "voice"));
  useEffect(() => {
    if (!s) return;
    if (USE_APPWRITE) appwriteChat.list().then(setMsgs).catch((x) => toast.error((x as Error).message));
    else setMsgs(JSON.parse(localStorage.getItem(key) ?? "[]"));
  }, [s, key]);
  useEffect(() => { if (s && !USE_APPWRITE) localStorage.setItem(key, JSON.stringify(msgs.slice(-50))); end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, s, key]);
  const send = async (q: string, source: "text" | "voice" = "text") => {
    const question = q.trim();
    if (!question || typing || (speech.state !== "idle" && source !== "voice") || !s) return;
    const history = msgs.slice(-12);
    if (source === "text") setText("");
    setMsgs((m) => [...m, { role: "user", text: question }]); setTyping(true);
    try {
      let a: string;
      if (USE_APPWRITE) {
        await appwriteChat.add("user", question);
        const result = await appwriteAssistant.ask(question, history);
        a = result.reply;
        await appwriteChat.add("bot", a);
      } else {
        if (!farm.score) throw new Error(farm.error ? "Could not load the records needed for your quality score." : "Your farm records are still loading. Please try again in a moment.");
        a = await answer(question, { county: s.user.county, harvests: farm.harvests, traces: farm.traces, stock: farm.inventory, expenses: farm.expenses, losses: farm.losses });
      }
      setMsgs((m) => [...m, { role: "bot", text: a }]);
    } catch (x) { toast.error((x as Error).message); } finally { setTyping(false); }
  };
  return (
    <>
      <PageHeader title="Farm Assistant" subtitle={USE_APPWRITE ? "Type or speak — AI answers use live weather, your quality score and farm records" : "Ask about weather, your quality score, stock, costs or crops"} action={msgs.length ? <Button variant="ghost" size="sm" onClick={async () => { if (USE_APPWRITE) await appwriteChat.clear(); setMsgs([]); }}><Trash2 />Clear</Button> : undefined} />
      <div className="flex h-[calc(100vh-15rem)] min-h-96 flex-col rounded-2xl border border-border bg-card shadow-soft">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {!msgs.length && <div className="flex flex-col items-center gap-4 py-8 text-center"><span className="grid size-14 place-items-center rounded-2xl bg-brand text-accent-foreground"><Sprout /></span><p className="max-w-md text-muted-foreground">Hi! Type a question or tap the microphone to speak. I’ll use live weather and your saved farm records to answer.</p>
            <div className="flex flex-wrap justify-center gap-2">{suggestions.map((x) => <button key={x} onClick={() => send(x)} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary">{x}</button>)}</div></div>}
          {msgs.map((m, i) => <div key={i} data-chat-message={m.role} className={cn("max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm", m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted")}>{m.text}</div>)}
          {typing && <div className="flex max-w-[85%] items-center gap-3 rounded-2xl bg-muted px-4 py-3"><div className="flex gap-1">{[0, 1, 2].map((i) => <span key={i} className="size-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: `${i * 0.15}s` }} />)}</div><span className="text-xs text-muted-foreground">Checking live weather and farm records…</span></div>}
          <div ref={end} />
        </div>
        <div className="border-t border-border">
          {speech.state !== "idle" && (
            <div className="flex min-h-10 items-center gap-2 border-b border-border bg-muted/50 px-4 py-2 text-xs font-semibold" aria-live="polite">
              {speech.state === "recording" ? <>
                <span className="size-2 animate-pulse rounded-full bg-destructive" />
                <span className="flex-1">Listening… {formatRecordingTime(speech.seconds)} / {formatRecordingTime(MAX_RECORDING_SECONDS)}</span>
                <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={speech.cancel}>Cancel</Button>
              </> : <><LoaderCircle className="size-4 animate-spin text-primary" /><span>{typing ? "Getting your answer…" : "Processing your voice message…"}</span></>}
            </div>
          )}
          <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex gap-2 p-3">
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your question or use the microphone…" className="h-12" maxLength={500} aria-label="Message" disabled={speech.state === "transcribing"} />
            <Button
              type="button"
              size="icon"
              variant={speech.state === "recording" ? "destructive" : "outline"}
              className={cn("size-12 shrink-0 rounded-full", speech.state === "recording" && "shadow-glow")}
              onClick={speech.state === "recording" ? speech.stop : speech.start}
              disabled={typing || speech.state === "transcribing"}
              aria-label={speech.state === "recording" ? "Stop recording and send" : speech.state === "transcribing" ? "Processing voice message" : "Record voice message"}
              title={speech.state === "recording" ? "Stop and send" : "Speak your question"}
            >
              {speech.state === "recording" ? <Square className="fill-current" /> : speech.state === "transcribing" ? <LoaderCircle className="animate-spin" /> : <Mic />}
            </Button>
            <Button type="submit" size="icon" className="size-12 shrink-0" disabled={typing || speech.state !== "idle" || !text.trim()} aria-label="Send"><Send /></Button>
          </form>
        </div>
      </div>
    </>
  );
}

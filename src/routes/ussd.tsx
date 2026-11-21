import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PublicLayout } from "@/components/agtrack/PublicLayout";
import { Button } from "@/components/ui/button";
import { ussdStep } from "@/lib/ussd";

export const Route = createFileRoute("/ussd")({
  head: () => ({ meta: [{ title: "USSD / SMS demo — AgTrack" }, { name: "description", content: "Try the AgTrack USSD menu that works on any basic phone." }, { property: "og:title", content: "USSD / SMS demo — AgTrack" }, { property: "og:description", content: "Try the AgTrack USSD menu." }] }),
  component: Ussd,
});
function Ussd() {
  const [path, setPath] = useState<string[] | null>(null); const [input, setInput] = useState("");
  const screen = path ? ussdStep(path) : null;
  const press = (k: string) => setInput((v) => (v + k).slice(0, 20));
  const sendIt = () => { if (!path) { if (input === "*384#") setPath([]); setInput(""); return; } if (screen?.end) { setPath(null); setInput(""); return; } if (input) { setPath([...path, input]); setInput(""); } };
  return (
    <PublicLayout>
      <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-12 md:grid-cols-2">
        <div><h1 className="text-4xl font-bold">USSD / SMS demo</h1><p className="mt-3 text-muted-foreground">Farmers without smartphones can use AgTrack on any phone. Dial <b>*384#</b> on the phone to try it.</p>
          <p className="mt-4 rounded-xl bg-muted p-4 text-sm text-muted-foreground">This is a simulator. Going live needs a telecom gateway (for example Africa's Talking or an Orange Liberia short code).</p></div>
        <div className="mx-auto w-72 rounded-[2.5rem] bg-sidebar p-4 shadow-soft">
          <div className="h-56 whitespace-pre-line rounded-2xl bg-secondary p-4 font-mono text-sm text-secondary-foreground">{screen ? screen.text : "Dial *384#"}{"\n\n"}<span className="font-bold">{input}</span><span className="animate-pulse">_</span></div>
          <div className="mt-4 grid grid-cols-3 gap-2">{["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((k) => <button key={k} onClick={() => press(k)} className="h-12 rounded-xl bg-sidebar-accent text-lg font-bold text-sidebar-foreground active:scale-95">{k}</button>)}</div>
          <div className="mt-2 grid grid-cols-2 gap-2"><Button variant="secondary" onClick={() => { setInput(""); if (!input) setPath(null); }}>Clear</Button><Button variant="hero" onClick={sendIt}>{screen?.end ? "OK" : path ? "Send" : "Call"}</Button></div>
          {screen && !screen.end && path && path.length > 0 && <p className="mt-2 text-center text-xs text-sidebar-foreground/70">Type text with keypad, or use your keyboard below</p>}
          {path && !screen?.end && <input aria-label="Reply" value={input} onChange={(e) => setInput(e.target.value.slice(0, 20))} onKeyDown={(e) => e.key === "Enter" && sendIt()} className="mt-2 h-10 w-full rounded-lg bg-card px-3 text-sm text-foreground" />}
        </div>
      </div>
    </PublicLayout>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Boxes, CloudSun, MessageCircle, TrendingDown, Award, FileBarChart, QrCode, Smartphone, UserPlus, ClipboardList, Search, Loader2, ShieldCheck } from "lucide-react";
import { PublicLayout } from "@/components/agtrack/PublicLayout";
import { BatchTimeline } from "@/components/agtrack/BatchTimeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { api } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "AgTrack — Farm records & traceability for Liberia" },
    { name: "description", content: "Keep farm records, trace every harvest with a QR code and grow your quality score. Built for Liberian smallholder farmers." },
    { property: "og:title", content: "AgTrack — Farm records & traceability for Liberia" },
    { property: "og:description", content: "Keep farm records, trace every harvest with a QR code and grow your quality score." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Landing,
});

const features = [
  { icon: QrCode, t: "Traceability", d: "Every harvest gets a batch code and QR so buyers can trust where it came from." },
  { icon: Boxes, t: "Inventory & Expenses", d: "Track stock in and out, and see where your money goes." },
  { icon: Smartphone, t: "USSD / SMS", d: "No smartphone? Use simple phone menus to record and check." },
  { icon: CloudSun, t: "Weather", d: "7-day forecast for your county with planting and spraying tips." },
  { icon: MessageCircle, t: "Farm Assistant", d: "Ask farming questions and get short, practical answers." },
  { icon: TrendingDown, t: "Loss Records", d: "Log losses from pests, rot or floods and learn what to fix." },
  { icon: Award, t: "Quality Score", d: "A clear 0–100 score that shows buyers you farm well." },
  { icon: FileBarChart, t: "Reports", d: "Print simple farm reports for loans, co-ops and buyers." },
];
const steps = [{ icon: UserPlus, t: "Register", d: "Sign up with your phone, or let a field agent register you." }, { icon: ClipboardList, t: "Record", d: "Log harvests, expenses, stock and losses." }, { icon: QrCode, t: "Track", d: "Each batch is traced from farm to market." }, { icon: FileBarChart, t: "Report", d: "See your score and print reports." }];
const faqs = [
  ["Who can use AgTrack?", "Any smallholder farmer in Liberia's 15 counties. Field agents can also register farmers who do not have a smartphone."],
  ["Does it cost money?", "Registering and recording is free for farmers."],
  ["What if I have no internet?", "Field agents can save records offline and send them later. You can also use the USSD menu on a basic phone."],
  ["How do buyers check my produce?", "Buyers enter or scan the batch code on this page. They see the history of the batch, not your private details."],
  ["How is my quality score made?", "From your loss rate, how often you record, the grade of your harvest and how many batches are fully traced."],
];

function Lookup() {
  const [code, setCode] = useState(""); const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<Awaited<ReturnType<typeof api.batchHistory>> | undefined>();
  const go = async (e: React.FormEvent) => { e.preventDefault(); if (!code.trim()) return; setLoading(true); setRes(await api.batchHistory(code)); setLoading(false); };
  return (
    <section id="lookup" className="mx-auto max-w-3xl scroll-mt-20 px-4 pt-20">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-10">
        <div className="flex items-center gap-2 text-sm font-bold text-primary"><ShieldCheck className="size-5" /> For buyers</div>
        <h2 className="mt-2 text-3xl font-bold">Check where your produce came from</h2>
        <p className="mt-2 text-muted-foreground">Enter the batch code printed on the bag or QR label. Try <button type="button" className="font-semibold text-primary underline" onClick={() => setCode("LR-RIC-2400")}>LR-RIC-2400</button>.</p>
        <form onSubmit={go} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. LR-RIC-2400" aria-label="Batch code" className="h-12 text-base uppercase" maxLength={30} />
          <Button type="submit" size="lg" disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : <Search />} Look up</Button>
        </form>
        {res === null && <p className="mt-5 rounded-xl bg-muted p-4 text-sm">No batch found with that code. Check the code and try again.</p>}
        {res && (
          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-secondary px-3 py-1 font-semibold">{res.batch_code}</span>
              <span className="rounded-full bg-secondary px-3 py-1">{res.crop}</span>
              <span className="rounded-full bg-secondary px-3 py-1">{res.county} County</span>
              {res.grade && <span className="rounded-full bg-brand px-3 py-1 font-bold text-accent-foreground">Grade {res.grade}</span>}
            </div>
            <BatchTimeline stages={res.stages} />
          </div>
        )}
      </div>
    </section>
  );
}

function Landing() {
  return (
    <PublicLayout>
      <section id="home" className="relative overflow-hidden bg-hero">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">🇱🇷 Built for Liberian farmers</span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight sm:text-6xl">Record your farm. <span className="text-brand">Prove your quality.</span></h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">AgTrack keeps your harvests, costs and losses in one place, and traces every bag from your farm to the market.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="hero" size="lg"><Link to="/signup">Get Started <ArrowRight /></Link></Button>
              <Button asChild variant="outline" size="lg"><a href="#lookup">Check a batch</a></Button>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-sm">
            <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
              <p className="text-sm text-muted-foreground">Welcome, Musu</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-brand p-4 text-accent-foreground"><p className="text-xs font-semibold">Quality score</p><p className="font-display text-4xl font-bold">82</p></div>
                <div className="rounded-2xl bg-secondary p-4"><p className="text-xs font-semibold text-muted-foreground">Harvest</p><p className="font-display text-3xl font-bold">2.1t</p></div>
              </div>
              <div className="mt-4 space-y-2">
                {["Rice · LR-RIC-2400 · Traced", "Cassava · LR-CAS-2402 · Stored", "Pepper · LR-PEP-2403 · Harvested"].map((r) => <div key={r} className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2.5 text-sm"><QrCode className="size-4 text-primary" />{r}</div>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-20">
        <h2 className="text-3xl font-bold sm:text-4xl">Everything your farm needs</h2>
        <p className="mt-2 text-muted-foreground">Eight simple tools, one app.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.t} className="rounded-2xl border border-border bg-card p-5 shadow-soft transition-transform hover:-translate-y-1">
              <span className="grid size-11 place-items-center rounded-xl bg-brand text-accent-foreground"><f.icon className="size-5" /></span>
              <h3 className="mt-4 font-bold">{f.t}</h3><p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-20">
        <h2 className="text-3xl font-bold sm:text-4xl">How it works</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.t} className="rounded-2xl bg-sidebar p-6 text-sidebar-foreground">
              <div className="flex items-center gap-3"><span className="font-display text-3xl font-extrabold text-sidebar-primary">{i + 1}</span><s.icon className="size-5" /></div>
              <h3 className="mt-3 text-lg font-bold">{s.t}</h3><p className="mt-1 text-sm opacity-80">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="about" className="mx-auto grid max-w-6xl scroll-mt-20 gap-8 px-4 pt-20 md:grid-cols-2">
        <div><h2 className="text-3xl font-bold sm:text-4xl">About AgTrack</h2></div>
        <div className="space-y-4 text-muted-foreground">
          <p>AgTrack is a digital farm record, traceability and quality platform for smallholder farmers in Liberia. It connects farmers, field agents and the Ministry of Agriculture.</p>
          <p>Farmers get better prices when buyers can trust their produce. The Ministry gets clear national data to plan support where it is needed most.</p>
        </div>
      </section>

      <section id="faqs" className="mx-auto max-w-3xl scroll-mt-20 px-4 pt-20">
        <h2 className="text-3xl font-bold sm:text-4xl">FAQs</h2>
        <Accordion type="single" collapsible className="mt-6">
          {faqs.map(([q, a]) => <AccordionItem key={q} value={q!}><AccordionTrigger className="text-left text-base font-semibold">{q}</AccordionTrigger><AccordionContent className="text-muted-foreground">{a}</AccordionContent></AccordionItem>)}
        </Accordion>
      </section>
      <Lookup />
    </PublicLayout>
  );
}

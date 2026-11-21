import { Link } from "@tanstack/react-router";
import { Menu, Phone, Mail, MapPin } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";

const links = [{ href: "/#home", label: "Home" }, { href: "/#about", label: "About" }, { href: "/#faqs", label: "FAQs" }, { href: "/#lookup", label: "Check a batch" }];

export function PublicNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" aria-label="AgTrack home"><Logo className="h-9" /></Link>
        <nav className="hidden items-center gap-7 text-sm font-semibold text-foreground/80 md:flex">
          {links.map((l) => <a key={l.href} href={l.href} className="hover:text-primary">{l.label}</a>)}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost"><Link to="/login">Sign in</Link></Button>
          <Button asChild variant="hero"><Link to="/signup">Sign up</Link></Button>
        </div>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu" onClick={() => setOpen(!open)}><Menu /></Button>
      </div>
      {open && (
        <div className="space-y-1 border-t border-border px-4 py-3 md:hidden">
          {links.map((l) => <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-3 font-semibold hover:bg-muted">{l.label}</a>)}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button asChild variant="outline"><Link to="/login">Sign in</Link></Button>
            <Button asChild variant="hero"><Link to="/signup">Sign up</Link></Button>
          </div>
        </div>
      )}
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="mt-20 bg-sidebar text-sidebar-foreground">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
        <div className="space-y-3">
          <div className="inline-block rounded-xl bg-card px-3 py-2"><Logo /></div>
          <p className="text-sm opacity-80">Farm records, traceability and quality for Liberia's smallholder farmers.</p>
        </div>
        <div className="space-y-2 text-sm">
          <h4 className="font-bold text-sidebar-primary">Contact</h4>
          <p className="flex items-center gap-2 opacity-90"><MapPin className="size-4" /> Ministry of Agriculture, Monrovia</p>
          <p className="flex items-center gap-2 opacity-90"><Phone className="size-4" /> +231 770 000 000</p>
          <p className="flex items-center gap-2 opacity-90"><Mail className="size-4" /> support@agtrack.lr</p>
        </div>
        <div className="space-y-2 text-sm">
          <h4 className="font-bold text-sidebar-primary">Links</h4>
          <Link to="/login" className="block opacity-90 hover:opacity-100">Sign in</Link>
          <Link to="/signup" className="block opacity-90 hover:opacity-100">Sign up</Link>
          <Link to="/ussd" className="block opacity-90 hover:opacity-100">USSD / SMS demo</Link>
          <a href="/#lookup" className="block opacity-90 hover:opacity-100">Check a batch</a>
        </div>
      </div>
      <p className="border-t border-sidebar-border py-4 text-center text-xs opacity-70">© {new Date().getFullYear()} AgTrack Liberia</p>
    </footer>
  );
}

export function PublicLayout({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen flex-col"><PublicNav /><main className="flex-1">{children}</main><PublicFooter /></div>;
}

import type { ReactNode } from "react";
import { PublicLayout } from "./PublicLayout";
export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <PublicLayout>
      <div className="bg-hero px-4 py-12 sm:py-20">
        <div className="mx-auto max-w-md rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
          <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </PublicLayout>
  );
}

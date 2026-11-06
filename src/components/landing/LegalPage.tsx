import type { ReactNode } from "react";
import { LandingFooter, LandingNav } from "./LandingChrome";
import { PublicTheme } from "./PublicTheme";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div id="top" className="min-h-dvh bg-background text-foreground">
      <PublicTheme />
      <LandingNav />
      <main className="mx-auto w-full max-w-3xl px-4 pt-8 pb-16 sm:px-6 sm:pt-14 sm:pb-24">
        <p className="text-xs font-medium tracking-[0.16em] text-link uppercase">Todobee</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h1>
        <div className="mt-8 border-t border-border pt-8">{children}</div>
      </main>
      <LandingFooter />
    </div>
  );
}

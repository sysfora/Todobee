import type { ReactNode } from "react";
import { LandingFooter, LandingNav, HELP_EMAIL } from "./LandingChrome";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div id="top" className="min-h-dvh bg-surface text-foreground">
      <LandingNav />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-semibold text-foreground">{title}</h1>
        <div className="mt-6 space-y-4 text-muted-foreground">{children}</div>
        <p className="mt-8 text-sm text-muted-foreground">
          Questions? Email{" "}
          <a className="text-primary underline" href={`mailto:${HELP_EMAIL}`}>
            {HELP_EMAIL}
          </a>
          .
        </p>
      </main>
      <LandingFooter />
    </div>
  );
}

export function legalHead(title: string, description: string, path: string) {
  return {
    meta: [
      { title: `${title} — Todobee` },
      { name: "description", content: description },
      { property: "og:title", content: `${title} — Todobee` },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: `https://todobeenew.lovable.app${path}` }],
  };
}

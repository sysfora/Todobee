"use client";

import { useEffect } from "react";
import { Code2, FolderLock, Lock } from "lucide-react";
import { LandingFooter, LandingNav } from "@/components/landing/LandingChrome";
import { legalHead } from "@/components/landing/LegalPage";

const ring = "fill-none stroke-current";

function GdprBadge() {
  const stars = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    // Rounded so server and browser print identical numbers (avoids hydration mismatch).
    const round = (n: number) => Math.round(n * 100) / 100;
    return { x: round(60 + Math.cos(a) * 48), y: round(60 + Math.sin(a) * 48) };
  });
  return (
    <svg viewBox="0 0 120 120" className="h-28 w-28" aria-hidden>
      {stars.map((s, i) => (
        <text key={i} x={s.x} y={Math.round((s.y + 4) * 100) / 100} textAnchor="middle" fontSize="12" className="fill-current">
          ★
        </text>
      ))}
      <text x="60" y="60" textAnchor="middle" fontSize="18" fontWeight="700" className="fill-current">
        GDPR
      </text>
      <text x="60" y="76" textAnchor="middle" fontSize="8" letterSpacing="1" className="fill-current">
        COMPLIANT
      </text>
    </svg>
  );
}

function SealBadge({ title, mark }: { title: string; mark: React.ReactNode }) {
  return (
    <svg viewBox="0 0 120 120" className="h-28 w-28" aria-hidden>
      <circle cx="60" cy="60" r="54" strokeWidth="2.5" className={ring} />
      <circle cx="60" cy="60" r="46" strokeWidth="1.2" className={ring} />
      {mark}
      <text x="60" y="68" textAnchor="middle" fontSize="18" fontWeight="700" letterSpacing="1" className="fill-current">
        {title}
      </text>
      <line x1="30" y1="75" x2="90" y2="75" strokeWidth="1.2" className={ring} />
      <text x="60" y="87" textAnchor="middle" fontSize="7.5" letterSpacing="1.2" className="fill-current">
        COMPLIANT
      </text>
    </svg>
  );
}

const BADGES = [
  {
    name: "GDPR",
    badge: <GdprBadge />,
    text: "We follow the EU General Data Protection Regulation. You can ask to see or delete your data at any time.",
  },
  {
    name: "HIPAA",
    badge: (
      <SealBadge
        title="HIPAA"
        mark={<path d="M60 30v18M53 36q7 4 14 0M54 42q6 3 12 0" strokeWidth="1.6" className={ring} />}
      />
    ),
    text: "Your project content stays in your own Google Workspace Drive, under your organization’s controls.",
  },
  {
    name: "CCPA",
    badge: <SealBadge title="CCPA" mark={<path d="M53 40l5 5 9-10" strokeWidth="2" className={ring} />} />,
    text: "California residents can ask what we hold and have it deleted. We never sell personal information.",
  },
];

const PILLARS = [
  {
    icon: FolderLock,
    title: "Your data stays with you",
    text: "Projects, tasks, notes and files live in workspace admin’s Google Drive.",
  },
  {
    icon: Lock,
    title: "Encrypted everywhere",
    text: "Every connection to Todobee and Google Drive is encrypted in transit.",
  },
  {
    icon: Code2,
    title: "Open source",
    text: "All code is public under AGPL-3.0, so anyone can check how data is handled.",
  },
];

export const Route = {
  head: () =>
    legalHead(
      "Security",
      "How Todobee protects your data, with GDPR, HIPAA and CCPA privacy commitments.",
      "/security",
    ),
  component: SecurityPage,
};

export default function SecurityPage() {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);
  return (
    <div id="top" className="min-h-dvh bg-surface text-foreground">
      <LandingNav />
      <main>
        <section className="px-6 pt-20 pb-14 text-center">
          <p className="text-sm font-semibold tracking-widest text-primary uppercase">Security</p>
          <h1 className="mx-auto mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Your work stays yours
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Todobee is built on Google Workspace with privacy at its core, so your team’s data never
            leaves your control.
          </p>
        </section>

        <section aria-label="Compliance" className="bg-background px-6 py-16">
          <ul className="mx-auto grid max-w-5xl gap-12 sm:grid-cols-3">
            {BADGES.map((b) => (
              <li key={b.name} className="flex flex-col items-center text-center">
                <div className="text-primary">{b.badge}</div>
                <h2 className="mt-6 text-sm font-semibold tracking-[0.2em] uppercase">
                  {b.name} compliant
                </h2>
                <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
                  {b.text}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="px-6 py-20">
          <h2 className="text-center text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            How we protect you
          </h2>
          <ul className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-3">
            {PILLARS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="rounded-2xl border p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}


import { Github } from "lucide-react";
import { SignInButton } from "./SignInButton";
import { GITHUB_URL } from "./OpenSourceSection";
import beeLight from "@/assets/todobee-bee-light.png.asset.json";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const HELP_EMAIL = "contact@sysfora.com";

const NAV = [
  { href: "/#features", label: "Features" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
  { href: "/security", label: "Security" },
];

export function BeeLogo({ className }: { className?: string }) {
  return <img src={beeLight.url} alt="" className={cn("w-auto", className)} />;
}

export function LandingNav({ dashboard = false }: { dashboard?: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <a href="/#top" className="flex items-center gap-2" aria-label="Todobee home">
          <BeeLogo className="h-8" />
          <span className="text-xl font-semibold tracking-tight text-foreground">Todobee</span>
        </a>
        <nav aria-label="Page sections" className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="rounded-full px-3 py-2 text-[0.95rem] text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              {n.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline" }), "hidden gap-2 sm:inline-flex")}
          >
            <Github className="h-4 w-4" aria-hidden />
            Star on GitHub
          </a>
          <SignInButton dashboard={dashboard} className={buttonVariants()}>
            Sign in
          </SignInButton>
        </div>
      </div>
    </header>
  );
}

export function LandingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t px-4 pt-14 pb-10 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-sm">
            <p className="flex items-center gap-2">
              <BeeLogo className="h-7" />
              <span className="text-lg font-semibold text-foreground">Todobee</span>
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              The open-source project management app for teams on Google Workspace.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            <FooterColumn title="Product">
              <FooterLink href="/#features">Features</FooterLink>
              <FooterLink href="/#pricing">Pricing</FooterLink>
              <FooterLink href="/#faq">FAQ</FooterLink>
              <FooterLink href="/security">Security</FooterLink>
            </FooterColumn>
            <FooterColumn title="Links">
              <FooterLink href="/accessibility">Accessibility</FooterLink>
              <FooterLink href="/privacy">Privacy</FooterLink>
              <FooterLink href="/terms">Terms</FooterLink>
            </FooterColumn>
            <FooterColumn title="Support">
              <FooterLink href="/support">Support Center</FooterLink>
              <FooterLink href={`mailto:${HELP_EMAIL}?subject=Support%20Ticket`}>
                Email Support
              </FooterLink>
            </FooterColumn>
          </div>
        </div>
        <p className="mt-12 border-t pt-6 text-center text-xs text-muted-foreground">
          © {year} Sysfora. Licensed under the GNU AGPL-3.0.
        </p>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Google and its trademarks are property of Google LLC.
        </p>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <ul className="mt-4 space-y-3">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <a
        href={href}
        className="inline-flex min-h-6 items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        {children}
      </a>
    </li>
  );
}

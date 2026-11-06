"use client";

import { useEffect, useState } from "react";
import { Cookie, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const COOKIE_KEY = "todobee:cookies-acknowledged";

/**
 * One-line cookie notice shown on the landing page. The only action is "Okay",
 * which is remembered in this browser so the notice doesn't come back.
 */
export function CookieConsent() {
  const [open, setOpen] = useState(false);

  // The choice lives in browser storage, so it can only be read after the page loads.
  useEffect(() => {
    let acknowledged = false;
    try {
      acknowledged = localStorage.getItem(COOKIE_KEY) === "yes";
    } catch {
      // Storage can be blocked (private mode); showing the notice again is harmless.
    }
    if (acknowledged) return;
    const timer = window.setTimeout(() => setOpen(true), 600);
    return () => window.clearTimeout(timer);
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(COOKIE_KEY, "yes");
    } catch {
      // Nothing to do if storage is unavailable; the notice just shows again next visit.
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 sm:px-6 sm:pb-6"
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-panel sm:flex-row sm:items-center sm:gap-5">
        <Cookie className="h-6 w-6 shrink-0 text-link" aria-hidden />
        <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
          We use cookies to keep this site running and to see which pages are useful. Read how in
          our{" "}
          <a href="/privacy" className="font-medium text-link hover:underline">
            Privacy Policy
          </a>
          .
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={accept} className={cn(buttonVariants(), "px-8")}>
            Okay
          </button>
          <button
            type="button"
            onClick={accept}
            aria-label="Dismiss cookie notice"
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

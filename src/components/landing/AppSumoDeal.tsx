"use client";

import { useEffect, useState } from "react";
import { ArrowRight, X } from "lucide-react";

export const APPSUMO_URL = "https://appsumo.com/pl/hTzGeMzQip/";
const DISMISS_KEY = "todobee:appsumo-deal-dismissed";

// Matches the exact same blue token used by the "Sign in" button
const dealBlue = "var(--primary)";

/**
 * AppSumo lifetime-deal strip shown at the very top of the landing page.
 * Only the "Grab it here" link is clickable. Dismissal is remembered in this
 * browser so the strip doesn't come back.
 */
export function AppSumoDeal() {
  const [open, setOpen] = useState(false);

  // The choice lives in browser storage, so it can only be read after hydration
  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "yes";
    } catch {
      // Storage can be blocked (e.g. private mode); harmless fallback
    }
    if (!dismissed) setOpen(true);
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "yes");
    } catch {
      // Storage unavailable fallback
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      role="region"
      aria-label="AppSumo lifetime deal"
      className="relative z-40 border-b px-4 py-2.5 pr-12 text-center sm:px-6"
      style={{ backgroundColor: dealBlue }}
    >
      <p className="text-sm leading-6 text-white">
        {/* "Lifetime deal" badge is hidden on mobile and appears from tablet/desktop upwards */}
        <span className="mr-2 hidden rounded-full bg-white/20 px-2.5 py-0.5 align-middle text-xs leading-4 sm:inline-block">
          Lifetime deal
        </span>
        Todobee is on AppSumo.{" "}
        <a
          href={APPSUMO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 whitespace-nowrap rounded-sm underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Grab it here <ArrowRight className="h-4 w-4" aria-hidden />
        </a>
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss AppSumo deal"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-4"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

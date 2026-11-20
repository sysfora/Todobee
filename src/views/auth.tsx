"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import beeLight from "@/assets/todobee-bee-light.png.asset.json";
import beeDark from "@/assets/todobee-bee-dark.png.asset.json";
import { rememberNextPath, safeRedirect, subscribeStep } from "@/lib/account";
import { useNavigate } from "@/lib/nav";
import { Button } from "@/components/ui/button";

const NEXT_KEY = "todobee:after-sign-in";

export function AuthPage() {
  const search = useSearchParams();
  const navigate = useNavigate();
  const grant = search.get("grant") || "";
  const sig = search.get("sig") || "";
  const redirect = search.get("redirect") || search.get("next") || "";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(search.get("auth_error") ? "We couldn't sign you in with Google. Please try again." : null);

  useEffect(() => {
    if (redirect) rememberNextPath(redirect);
    if (grant && sig) {
      void fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      return;
    }
    const go = async () => {
      const res = await fetch("/api/me", { credentials: "include" });
      if (!res.ok) return;
      const account = await res.json();
      const next =
        subscribeStep(account) === "app"
          ? safeRedirect(sessionStorage.getItem(NEXT_KEY) ?? redirect)
          : "/subscribe";
      sessionStorage.removeItem(NEXT_KEY);
      void navigate({ href: next, replace: true });
    };
    void go();
  }, [grant, sig, redirect, navigate]);

  const signIn = () => {
    setBusy(true);
    setError(null);
    if (!sessionStorage.getItem(NEXT_KEY)) rememberNextPath(redirect || "/dashboard");
    const next = safeRedirect(sessionStorage.getItem(NEXT_KEY));
    const params = new URLSearchParams({ next });
    if (grant && sig) {
      params.set("grant", grant);
      params.set("sig", sig);
    }
    window.location.href = `/api/auth/google?${params.toString()}`;
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-3xl bg-surface px-6 py-10 text-center shadow-panel sm:px-10">
        <img src={beeLight.url} alt="" className="mx-auto h-14 w-auto dark:hidden" />
        <img src={beeDark.url} alt="" className="mx-auto hidden h-14 w-auto dark:block" />
        <h1 className="mt-5 text-2xl font-normal text-foreground">Sign in to Todobee</h1>
        <p className="mt-2 text-sm text-muted-foreground">Use your Google account</p>

        <Button
          variant="outline"
          size="lg"
          onClick={signIn}
          disabled={busy}
          className="mt-8 w-full text-foreground [&_svg]:size-5"
        >
          {busy ? <Loader2 className="animate-spin" /> : <GoogleMark />}
          Continue with Google
        </Button>

        {error && (
          <p role="alert" className="mt-4 text-sm text-danger">
            {error}
          </p>
        )}

        <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
          Sign in or sign up to access your workspace. If you've been invited by someone, you'll join
          their workspace.
        </p>
      </div>
    </main>
  );
}

/** Google's "G" mark in its brand colors. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className="size-5">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

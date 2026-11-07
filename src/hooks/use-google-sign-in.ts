"use client";

import { useState } from "react";
import { useNavigate } from "@/lib/nav";
import { hasPendingSignIn, rememberNextPath, safeRedirect, subscribeStep, takeNextPath } from "@/lib/account";
import { useEffect } from "react";

/** Sends people straight to Google, then into the app. Consent is only forced when Drive is not connected yet. */
export function useGoogleSignIn(options?: { consent?: boolean }) {
  const [busy, setBusy] = useState(false);
  const consent = options?.consent ?? false;

  const signIn = () => {
    setBusy(true);
    if (!hasPendingSignIn()) rememberNextPath("/dashboard");
    const next = safeRedirect(sessionStorage.getItem("todobee:after-sign-in"));
    const ask = consent ? "&consent=1" : "";
    window.location.href = `/api/auth/google?next=${encodeURIComponent(next)}${ask}`;
  };

  return { signIn, busy };
}

let sessionCheck: Promise<boolean> | null = null;

/** True once `/api/me` confirms a session. Shared so the landing page checks once. */
export function useSignedIn() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    sessionCheck ??= fetch("/api/me", { credentials: "include" })
      .then((res) => res.ok)
      .catch(() => false);
    let live = true;
    void sessionCheck.then((ok) => {
      if (live) setSignedIn(ok);
    });
    return () => {
      live = false;
    };
  }, []);
  return signedIn;
}

/** When someone comes back from Google with a session cookie, carry on into the app. */
export function useResumeSignIn() {
  const navigate = useNavigate();
  useEffect(() => {
    if (!hasPendingSignIn()) return;
    void fetch("/api/me", { credentials: "include" }).then(async (res) => {
      if (!res.ok || !hasPendingSignIn()) return;
      const account = await res.json();
      const dest = subscribeStep(account) === "app" ? takeNextPath() : "/subscribe";
      navigate({ href: dest, replace: true });
    });
  }, [navigate]);
}

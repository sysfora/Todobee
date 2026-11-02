"use client";

import { useState } from "react";
import { useNavigate } from "@/lib/nav";
import { hasPendingSignIn, rememberNextPath, safeRedirect, subscribeStep, takeNextPath } from "@/lib/account";
import { useEffect } from "react";

/** Sends people straight to Google, including Google Drive access, then into the app. */
export function useGoogleSignIn() {
  const [busy, setBusy] = useState(false);

  const signIn = () => {
    setBusy(true);
    if (!hasPendingSignIn()) rememberNextPath("/dashboard");
    const next = safeRedirect(sessionStorage.getItem("todobee:after-sign-in"));
    window.location.href = `/api/auth/google?next=${encodeURIComponent(next)}`;
  };

  return { signIn, busy };
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

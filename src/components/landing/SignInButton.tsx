"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useGoogleSignIn, useSignedIn } from "@/hooks/use-google-sign-in";
import { cn } from "@/lib/utils";

/** Opens Google sign-in. Shows Dashboard only when `dashboard` is set and a session exists. */
export function SignInButton({
  className,
  signedInClassName,
  dashboard = false,
  children,
}: {
  className?: string;
  signedInClassName?: string;
  dashboard?: boolean;
  children: ReactNode;
}) {
  const { signIn, busy } = useGoogleSignIn();
  const signedIn = useSignedIn();
  if (dashboard && signedIn) {
    return (
      <a
        href="/dashboard"
        className={signedInClassName ?? cn(className, "px-6")}
      >
        Dashboard
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={() => void signIn()}
      disabled={busy}
      aria-busy={busy}
      className={className}
    >
      {children}
      {busy && <Loader2 className="animate-spin" aria-hidden />}
    </button>
  );
}

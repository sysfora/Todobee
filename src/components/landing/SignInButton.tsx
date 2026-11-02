"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useGoogleSignIn } from "@/hooks/use-google-sign-in";

/** Any "Get started" / "Sign in" on the homepage: opens Google sign-in directly. */
export function SignInButton({ className, children }: { className?: string; children: ReactNode }) {
  const { signIn, busy } = useGoogleSignIn();
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

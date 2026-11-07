"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useGoogleSignIn, useSignedIn } from "@/hooks/use-google-sign-in";
import { cn } from "@/lib/utils";

/** Any "Get started" / "Sign in" on the homepage: opens Google sign-in, or the app when already signed in. */
export function SignInButton({
  className,
  signedInClassName,
  children,
}: {
  className?: string;
  signedInClassName?: string;
  children: ReactNode;
}) {
  const { signIn, busy } = useGoogleSignIn();
  const signedIn = useSignedIn();
  if (signedIn) {
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

import type { Metadata } from "next";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { AuthPage } from "@/views/auth";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Todobee with your Google account to plan projects and track tasks.",
  openGraph: {
    title: "Sign in — Todobee",
    description: "Sign in to Todobee with your Google account to plan projects and track tasks.",
    type: "website",
  },
  twitter: { card: "summary" },
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center bg-background">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <AuthPage />
    </Suspense>
  );
}

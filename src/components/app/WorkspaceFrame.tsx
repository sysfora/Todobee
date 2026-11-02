"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { accountQuery, clearNextPath, subscribeStep } from "@/lib/account";
import { homePathFor } from "@/lib/permissions";
import { actions, hydrateStore } from "@/lib/store";
import { useGoogleSignIn } from "@/hooks/use-google-sign-in";

export function WorkspaceFrame({
  children,
  adminOnly = false,
}: {
  children: ReactNode;
  adminOnly?: boolean;
}) {
  const router = useRouter();
  const { signIn, busy } = useGoogleSignIn();
  const query = useQuery({ ...accountQuery, retry: false });

  useEffect(() => {
    clearNextPath();
  }, []);

  useEffect(() => {
    if (query.isError) {
      router.replace("/");
      return;
    }
    const account = query.data;
    if (!account) return;
    if (subscribeStep(account) !== "app") {
      router.replace("/subscribe");
      return;
    }
    if (adminOnly && account.role !== "admin") {
      router.replace(homePathFor(account.role));
      return;
    }
    void hydrateStore(account.role).then(() => actions.syncWorkspace(account.workspace));
  }, [adminOnly, query.data, query.isError, router]);

  const account = query.data;
  if (query.isLoading || !account || subscribeStep(account) !== "app") {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (adminOnly && account.role !== "admin") {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <AppShell role={account.role}>
      {account.role === "admin" && !account.driveConnected && (
        <div className="mx-4 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3 text-sm shadow-card md:mx-8">
          <p>Google Drive isn't connected, so this workspace is only cached in Todobee.</p>
          <button
            type="button"
            onClick={() => signIn()}
            disabled={busy}
            className="font-medium text-link hover:underline"
          >
            Connect Google Drive
          </button>
        </div>
      )}
      {children}
    </AppShell>
  );
}

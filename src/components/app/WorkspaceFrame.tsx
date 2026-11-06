"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { accountQuery, clearNextPath, subscribeStep } from "@/lib/account";
import { isDemo } from "@/lib/demo-mode";
import { homePathFor } from "@/lib/permissions";
import { actions, hydrateStore, useStoreHydrated } from "@/lib/store";
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
  const hydrated = useStoreHydrated();
  const query = useQuery({ ...accountQuery, enabled: !isDemo, retry: false });

  useEffect(() => {
    if (isDemo) void hydrateStore("admin");
  }, []);

  useEffect(() => {
    clearNextPath();
  }, []);

  useEffect(() => {
    if (isDemo) return;
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
  if (isDemo) {
    if (!hydrated) {
      return (
        <div className="flex h-dvh items-center justify-center bg-background">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }
    return (
      <AppShell role="admin">
        <p className="mx-4 mt-4 rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground md:mx-8">
          Sample workspace. Changes stay in this browser. Nothing is emailed, saved to a database, or charged.
        </p>
        {children}
      </AppShell>
    );
  }
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

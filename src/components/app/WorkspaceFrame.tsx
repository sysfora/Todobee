"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { accountQuery, clearNextPath, subscribeStep } from "@/lib/account";
import { isDemo } from "@/lib/demo-mode";
import { homePathFor } from "@/lib/permissions";
import { actions, hydrateStore, useStoreHydrated } from "@/lib/store";

export function WorkspaceFrame({
  children,
  adminOnly = false,
}: {
  children: ReactNode;
  adminOnly?: boolean;
}) {
  const router = useRouter();
  const hydrated = useStoreHydrated();
  const openedWorkspace = useRef<string | undefined>(undefined);
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
    if (openedWorkspace.current && openedWorkspace.current !== account.workspace.id) {
      window.location.assign(subscribeStep(account) === "app" ? homePathFor(account.role) : "/subscribe");
      return;
    }
    openedWorkspace.current = account.workspace.id;
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
    <AppShell role={account.role}>{children}</AppShell>
  );
}

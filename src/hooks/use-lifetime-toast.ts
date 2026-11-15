"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { accountQuery } from "@/lib/account";

/** Shows a success toast after a lifetime grant and refreshes /api/me so the app isn't stuck on an old unpaid cache. */
export function useLifetimeToast() {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("lifetime") === "activated";
  });
  const [ready, setReady] = useState(!pending);

  useEffect(() => {
    if (!pending) return;
    toast.success("Your lifetime plan is now active.");
    const url = new URL(window.location.href);
    url.searchParams.delete("lifetime");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    void queryClient
      .invalidateQueries({ queryKey: accountQuery.queryKey })
      .finally(() => setReady(true));
    setPending(false);
  }, [pending, queryClient]);

  return ready;
}

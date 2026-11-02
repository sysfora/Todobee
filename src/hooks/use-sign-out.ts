"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@/lib/nav";
import { clearNextPath } from "@/lib/account";

/** Signs out, drops cached account data and leaves the app without a Back-button way in. */
export function useSignOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    clearNextPath();
    navigate({ to: "/", replace: true });
  };
}

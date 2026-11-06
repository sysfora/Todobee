"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "@/lib/nav";
import { clearNextPath } from "@/lib/account";
import { isDemo } from "@/lib/demo-mode";

/** Signs out, drops cached account data and leaves the app without a Back-button way in. */
export function useSignOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    if (isDemo) {
      toast("This demo stays on this browser", {
        description: "There is no account to sign out of.",
      });
      return;
    }
    await queryClient.cancelQueries();
    queryClient.clear();
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    clearNextPath();
    navigate({ to: "/", replace: true });
  };
}

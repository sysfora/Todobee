"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { accountQuery } from "@/lib/account";

function ReturnInner() {
  const params = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("Confirming your subscription…");

  useEffect(() => {
    const sessionId = params.get("session_id");
    if (!sessionId) {
      router.replace("/subscribe");
      return;
    }
    void (async () => {
      const res = await fetch("/api/billing/confirm", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok) {
        setMessage("We couldn't confirm the payment. If you were charged, refresh in a moment.");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: accountQuery.queryKey });
      router.replace("/dashboard");
    })();
  }, [params, queryClient, router]);

  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" />
      <p>{message}</p>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center bg-background">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ReturnInner />
    </Suspense>
  );
}

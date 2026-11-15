"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { accountQuery } from "@/lib/account";
import { getPlan, type PlanId } from "@/lib/subscription";
import { Button } from "@/components/ui/button";
import { BeeLogo } from "@/components/landing/LandingChrome";

interface Preview {
  kind: "apply" | "downgrade";
  current: { plan: PlanId; seats: number; lifetime: boolean };
  next: { plan: PlanId; seats: number };
}

function label(plan: PlanId, seats: number) {
  return `${getPlan(plan).name} (${seats} seats)`;
}

export function ActivatePage() {
  const params = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const grant = params.get("grant") || "";
  const sig = params.get("sig") || "";
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Checking your plan…");

  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  useEffect(() => {
    if (!grant || !sig) {
      router.replace("/dashboard");
      return;
    }
    void (async () => {
      const res = await fetch(`/api/activation/preview?grant=${encodeURIComponent(grant)}&sig=${encodeURIComponent(sig)}`, {
        credentials: "include",
      });
      if (res.status === 401) {
        window.location.href = `/api/auth/google?next=${encodeURIComponent("/activate")}&grant=${encodeURIComponent(grant)}&sig=${encodeURIComponent(sig)}`;
        return;
      }
      const body = (await res.json().catch(() => ({}))) as Preview & { error?: string };
      if (!res.ok) {
        setMessage(body.error || "That activation link is not valid.");
        return;
      }
      if (body.kind !== "downgrade") {
        setBusy(true);
        const apply = await fetch("/api/activation/apply", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ grant, sig }),
        });
        const result = (await apply.json().catch(() => ({}))) as { next?: string; error?: string };
        if (!apply.ok) {
          setBusy(false);
          setMessage(result.error || "We couldn't apply this plan.");
          return;
        }
        await queryClient.invalidateQueries({ queryKey: accountQuery.queryKey });
        router.replace(result.next || "/dashboard");
        return;
      }
      setPreview(body);
    })();
  }, [grant, sig, queryClient, router]);

  async function apply(confirm: boolean) {
    setBusy(true);
    const res = await fetch("/api/activation/apply", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ grant, sig, confirm }),
    });
    const result = (await res.json().catch(() => ({}))) as { next?: string; error?: string };
    if (!res.ok) {
      setBusy(false);
      toast.error(result.error || "We couldn't update your plan.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: accountQuery.queryKey });
    router.replace(result.next || "/dashboard");
  }

  if (!preview) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-background px-4 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-16">
      <BeeLogo className="h-16" />
      <main className="mt-8 max-w-md text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Switch to a lower lifetime plan?</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          You already have lifetime {label(preview.current.plan, preview.current.seats)}. This purchase is{" "}
          {label(preview.next.plan, preview.next.seats)}. If you switch, seats and features from the higher plan will
          go away.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button variant="outline" disabled={busy} onClick={() => router.replace("/dashboard")}>
            Keep my current plan
          </Button>
          <Button disabled={busy} onClick={() => void apply(true)}>
            {busy && <Loader2 className="animate-spin" aria-hidden />}
            Switch to {label(preview.next.plan, preview.next.seats)}
          </Button>
        </div>
      </main>
    </div>
  );
}

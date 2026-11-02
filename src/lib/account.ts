import { queryOptions } from "@tanstack/react-query";
import type { PlanId } from "./subscription";

export interface Account {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: "admin" | "member";
  adminName: string | null;
  driveConnected: boolean;
  workspace: {
    id: string;
    name: string;
    plan: PlanId;
    seats: number;
    subscribedAt: string | null;
    renewsAt: string | null;
  };
}

export const subscribeStep = (a: Pick<Account, "role" | "workspace">) =>
  a.workspace.subscribedAt ? "app" : a.role === "admin" ? "choose-plan" : "wait-for-admin";

export function safeRedirect(path: unknown): string {
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//")) return "/dashboard";
  if (path.startsWith("/subscribe") || path.includes("\\")) return "/dashboard";
  return path;
}

const NEXT_KEY = "todobee:after-sign-in";

export const rememberNextPath = (path: unknown) =>
  sessionStorage.setItem(NEXT_KEY, safeRedirect(path));
export const hasPendingSignIn = () => sessionStorage.getItem(NEXT_KEY) !== null;
export function takeNextPath(): string {
  const next = safeRedirect(sessionStorage.getItem(NEXT_KEY));
  sessionStorage.removeItem(NEXT_KEY);
  return next;
}
export const clearNextPath = () => sessionStorage.removeItem(NEXT_KEY);

async function fetchAccount(): Promise<Account> {
  const res = await fetch("/api/me", { credentials: "include" });
  if (res.status === 401) throw new Error("You're signed out.");
  if (!res.ok) throw new Error("Your account isn't set up yet.");
  return res.json() as Promise<Account>;
}

export const accountQuery = queryOptions({
  queryKey: ["account"],
  queryFn: fetchAccount,
  staleTime: 60_000,
});

/** Sends the admin to Stripe Checkout for a yearly per-seat plan. */
export async function startCheckout(plan: PlanId, seats: number) {
  const res = await fetch("/api/billing/checkout", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ plan, seats }),
  });
  const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !body.url) throw new Error(body.error || "Stripe checkout didn't start.");
  window.location.href = body.url;
}

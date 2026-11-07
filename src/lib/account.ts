import { queryOptions } from "@tanstack/react-query";
import { isDemo } from "./demo-mode";
import { getState, actions } from "./store";
import { defaultRenewal, type PlanId } from "./subscription";

export interface Account {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: "admin" | "member";
  adminName: string | null;
  driveConnected: boolean;
  driveSyncError?: string | null;
  workspaces: { id: string; name: string; role: "admin" | "member" }[];
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

export function demoAccount(): Account {
  const state = getState();
  const me = state.users.find((user) => user.id === state.currentUserId) ?? state.users[0];
  const renewsAt = state.workspace.renewsAt ?? defaultRenewal();
  return {
    userId: me?.id ?? "u-admin",
    name: me?.name ?? "Lilly McCarthy",
    email: me?.email ?? "lilly@example.com",
    avatarUrl: me?.avatar ?? null,
    role: "admin",
    adminName: me?.name ?? "Lilly McCarthy",
    driveConnected: true,
    driveSyncError: null,
    workspaces: [{ id: "demo", name: state.workspace.name || "Todobee Workspace", role: "admin" }],
    workspace: {
      id: "demo",
      name: state.workspace.name || "Todobee Workspace",
      plan: state.workspace.plan,
      seats: state.workspace.seats,
      subscribedAt: renewsAt,
      renewsAt,
    },
  };
}

async function fetchAccount(): Promise<Account> {
  if (isDemo) return demoAccount();
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

export const PENDING_INVITE_KEY = "todobee-pending-invite";

/** Sends the admin to Stripe Checkout for a yearly per-seat plan. */
export async function startCheckout(plan: PlanId, seats: number) {
  if (isDemo) {
    actions.syncWorkspace({ plan, seats, renewsAt: defaultRenewal() });
    window.location.assign("/dashboard");
    return;
  }
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

/**
 * Plan and seat changes that cost money open Stripe for that amount.
 * A cheaper plan or fewer seats is saved here, with nothing due today.
 */
export async function startPlanChange(plan: PlanId, seats: number) {
  if (isDemo) {
    actions.syncWorkspace({ plan, seats, renewsAt: defaultRenewal() });
    return "updated" as const;
  }
  const res = await fetch("/api/billing/update", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ plan, seats }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    url?: string;
    error?: string;
    plan?: PlanId;
    seats?: number;
    renewsAt?: string | null;
    name?: string;
  };
  if (!res.ok) throw new Error(body.error || "Stripe checkout didn't start.");
  if (body.url) {
    window.location.href = body.url;
    return "redirect" as const;
  }
  actions.syncWorkspace({
    plan: body.plan ?? plan,
    seats: body.seats ?? seats,
    renewsAt: body.renewsAt,
    name: body.name,
  });
  return "updated" as const;
}

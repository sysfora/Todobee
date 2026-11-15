import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env.js";
import { pb, type PbUser, type PbWorkspace } from "./pb.js";
import { MIN_SEATS, type PlanId } from "./demo/subscription.js";
import type { AppState } from "./demo/types.js";

export interface LifetimeGrant {
  plan: PlanId;
  seats: number;
  tier?: number;
  exp: number;
}

const TIER_PLANS: Record<number, { plan: PlanId; seats: number }> = {
  1: { plan: "premium", seats: 10 },
  2: { plan: "premium", seats: 50 },
  3: { plan: "premium", seats: 150 },
  4: { plan: "pro", seats: 10 },
  5: { plan: "pro", seats: 50 },
  6: { plan: "pro", seats: 150 },
};

function fromTier(tier: unknown) {
  const n = Number(tier);
  if (!Number.isInteger(n)) return undefined;
  return TIER_PLANS[n];
}

export type LifetimeDecision = "apply" | "downgrade";

function secret() {
  return env.activationSecret();
}

function planRank(plan: PlanId) {
  if (plan === "enterprise") return 3;
  if (plan === "pro") return 2;
  return 1;
}

function parsePayload(body: string) {
  try {
    return JSON.parse(Buffer.from(body, "hex").toString("utf8")) as Partial<LifetimeGrant>;
  } catch {
    try {
      return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Partial<LifetimeGrant>;
    } catch {
      return null;
    }
  }
}

function signaturesMatch(body: string, signature: string) {
  const digest = createHmac("sha256", secret()).update(body).digest();
  let given: Buffer;
  try {
    given = Buffer.from(signature.trim(), "hex");
  } catch {
    return false;
  }
  if (!given.length || given.length !== digest.length) return false;
  return timingSafeEqual(digest, given);
}

/** Accept only a grant that was signed with the shared activation secret and has not expired. */
export function verifiedLifetimeGrant(body: string, signature: string): LifetimeGrant | null {
  if (!body || !signature || !secret()) return null;
  if (!signaturesMatch(body, signature)) return null;
  const payload = parsePayload(body);
  if (!payload?.exp || payload.exp < Date.now()) return null;
  const mapped = fromTier(payload.tier);
  const plan: PlanId = mapped?.plan ?? (payload.plan === "pro" ? "pro" : payload.plan === "enterprise" ? "enterprise" : "premium");
  const parsedSeats = Number(mapped?.seats ?? payload.seats);
  const seats = Number.isFinite(parsedSeats) && parsedSeats > 0 ? Math.max(MIN_SEATS, parsedSeats) : MIN_SEATS;
  return { plan, seats, tier: Number(payload.tier) || undefined, exp: payload.exp };
}

export async function ownedWorkspace(user: PbUser, fallback: PbWorkspace) {
  if (fallback.owner === user.id) return fallback;
  try {
    const rows = await pb()
      .collection("workspaces")
      .getFullList<PbWorkspace>({ filter: `owner="${user.id}"` });
    return rows[0] ?? fallback;
  } catch {
    return fallback;
  }
}

/** New lifetime or a higher plan/seats applies immediately. A lower lifetime plan needs confirmation. */
export function lifetimeDecision(user: PbUser, workspace: PbWorkspace, grant: LifetimeGrant): LifetimeDecision {
  if (!user.isLifetimePaid) return "apply";
  const currentRank = planRank(workspace.plan);
  const nextRank = planRank(grant.plan);
  if (nextRank < currentRank) return "downgrade";
  if (nextRank === currentRank && grant.seats < workspace.seats) return "downgrade";
  return "apply";
}

async function writeWorkspacePlan(workspace: PbWorkspace, grant: LifetimeGrant) {
  const mapped = fromTier(grant.tier);
  const plan = mapped?.plan ?? (grant.plan === "pro" ? "pro" : grant.plan === "enterprise" ? "enterprise" : "premium");
  const parsedSeats = Number(mapped?.seats ?? grant.seats);
  const seats = Number.isFinite(parsedSeats) && parsedSeats > 0 ? Math.max(MIN_SEATS, parsedSeats) : MIN_SEATS;
  const cache: AppState | undefined = workspace.cache
    ? {
        ...workspace.cache,
        workspace: { ...workspace.cache.workspace, plan, seats },
      }
    : undefined;
  const updated = await pb().collection("workspaces").update<PbWorkspace>(workspace.id, {
    plan,
    seats,
    subscribedAt: workspace.subscribedAt || new Date().toISOString(),
    status: "active",
    ...(cache ? { cache, cacheRevision: (workspace.cacheRevision ?? 0) + 1, driveSynced: false } : {}),
  });
  console.log(`[activation] Wrote ${plan} / ${seats} seats to workspace ${workspace.id}`);
  return updated;
}

export async function applyLifetimeGrant(grant: LifetimeGrant, user: PbUser, workspace: PbWorkspace) {
  await pb().collection("users").update(user.id, { isLifetimePaid: true });
  const owned = await pb()
    .collection("workspaces")
    .getFullList<PbWorkspace>({ filter: `owner="${user.id}"` })
    .catch(() => [] as PbWorkspace[]);
  const rows = owned.length ? owned : [await ownedWorkspace(user, workspace)];
  if (!rows.some((row) => row.id === workspace.id)) rows.push(workspace);
  let last = workspace;
  for (const row of rows) {
    last = await writeWorkspacePlan(row, grant);
  }
  return last;
}

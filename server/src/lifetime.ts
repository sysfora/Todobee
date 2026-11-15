import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env.js";
import { pb, type PbUser, type PbWorkspace } from "./pb.js";
import { MIN_SEATS, type PlanId } from "./demo/subscription.js";

export interface LifetimeGrant {
  plan: PlanId;
  seats: number;
  exp: number;
}

export type LifetimeDecision = "apply" | "downgrade";

function secret() {
  return env.activationSecret();
}

function hexHmac(body: string) {
  return createHmac("sha256", secret()).update(body).digest("hex");
}

function planRank(plan: PlanId) {
  if (plan === "enterprise") return 3;
  if (plan === "pro") return 2;
  return 1;
}

/** Accept only a grant that was signed with ACTIVATION_SECRET and has not expired. */
export function verifiedLifetimeGrant(body: string, signature: string): LifetimeGrant | null {
  if (!body || !signature || !secret()) return null;
  const expected = Buffer.from(hexHmac(body));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Partial<LifetimeGrant>;
    if (!payload.exp || payload.exp < Date.now()) return null;
    const plan: PlanId = payload.plan === "pro" ? "pro" : payload.plan === "enterprise" ? "enterprise" : "premium";
    const seats = Math.max(MIN_SEATS, Number(payload.seats) || MIN_SEATS);
    return { plan, seats, exp: payload.exp };
  } catch {
    return null;
  }
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

export async function applyLifetimeGrant(grant: LifetimeGrant, user: PbUser, workspace: PbWorkspace) {
  const target = await ownedWorkspace(user, workspace);
  await pb().collection("users").update(user.id, { isLifetimePaid: true });
  await pb().collection("workspaces").update(target.id, {
    plan: grant.plan,
    seats: grant.seats,
    subscribedAt: new Date().toISOString(),
    status: "active",
  });
  return target;
}

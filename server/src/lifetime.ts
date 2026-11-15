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
  const plan: PlanId = payload.plan === "pro" ? "pro" : payload.plan === "enterprise" ? "enterprise" : "premium";
  const seats = Math.max(MIN_SEATS, Number(payload.seats) || MIN_SEATS);
  return { plan, seats, exp: payload.exp };
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

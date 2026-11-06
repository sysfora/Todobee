import Stripe from "stripe";
import { env } from "./env.js";
import { pb, type PbWorkspace } from "./pb.js";
import type { PlanId } from "./demo/subscription.js";

let stripe: Stripe | null = null;

export function getStripe() {
  const key = env.stripeKey();
  if (!key) return null;
  if (!stripe) stripe = new Stripe(key);
  return stripe;
}

export function priceFor(plan: PlanId) {
  if (plan === "premium") return process.env.STRIPE_PRICE_PREMIUM || "";
  if (plan === "pro") return process.env.STRIPE_PRICE_PRO || "";
  return process.env.STRIPE_PRICE_ENTERPRISE || "";
}

export function planForPrice(priceId: string | undefined): PlanId | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_PREMIUM) return "premium";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  if (priceId === process.env.STRIPE_PRICE_ENTERPRISE) return "enterprise";
  return null;
}

function periodEnd(sub: Stripe.Subscription) {
  const legacy = (sub as Stripe.Subscription & { current_period_end?: number }).current_period_end;
  const itemEnd = (sub.items.data[0] as { current_period_end?: number } | undefined)?.current_period_end;
  const end = legacy || itemEnd;
  return end ? new Date(end * 1000).toISOString() : undefined;
}

export async function applyStripeSubscription(sub: Stripe.Subscription, fallback?: { workspaceId?: string; plan?: string }) {
  const workspaceId = sub.metadata.workspaceId || fallback?.workspaceId;
  if (!workspaceId) return;
  const priceId = sub.items.data[0]?.price?.id;
  const plan = (planForPrice(priceId) || sub.metadata.plan || fallback?.plan || "premium") as PlanId;
  const seats = sub.items.data[0]?.quantity || 10;
  const renewsAt = periodEnd(sub);
  const active = sub.status === "active" || sub.status === "trialing" || sub.status === "past_due";
  const current = await pb().collection("workspaces").getOne<PbWorkspace>(workspaceId);
  await pb().collection("workspaces").update(workspaceId, {
    plan,
    seats,
    renewsAt: renewsAt || current.renewsAt || "",
    stripeSubscriptionId: sub.id,
    stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
    subscribedAt: active ? current.subscribedAt || new Date().toISOString() : "",
    status: sub.status === "past_due" ? "past_due" : active ? "active" : "canceled",
  });
}

export async function createCheckout(workspace: PbWorkspace, email: string, plan: PlanId, seats: number, origin = env.appUrl()) {
  const stripeClient = getStripe();
  const price = priceFor(plan);
  if (!stripeClient || !price) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY and the price ids in .env.");
  }
  let customer = workspace.stripeCustomerId;
  if (!customer) {
    const created = await stripeClient.customers.create({
      email,
      metadata: { workspaceId: workspace.id },
    });
    customer = created.id;
    await pb().collection("workspaces").update(workspace.id, { stripeCustomerId: customer });
  }
  const session = await stripeClient.checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: workspace.id,
    line_items: [{ price, quantity: seats }],
    success_url: `${origin}/billing/return?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/subscribe`,
    allow_promotion_codes: true,
    metadata: { workspaceId: workspace.id, plan },
    subscription_data: { metadata: { workspaceId: workspace.id, plan } },
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  return session.url;
}

export async function updateSubscription(workspace: PbWorkspace, plan: PlanId, seats: number) {
  const stripeClient = getStripe();
  const price = priceFor(plan);
  if (!stripeClient || !price) throw new Error("Stripe is not configured.");
  if (!workspace.stripeSubscriptionId) throw new Error("This workspace doesn't have a Stripe subscription yet.");
  const current = await stripeClient.subscriptions.retrieve(workspace.stripeSubscriptionId);
  const item = current.items.data[0];
  if (!item) throw new Error("The Stripe subscription has no items.");
  const oldAmount = (item.price.unit_amount ?? 0) * (item.quantity ?? 1);
  const nextPrice = await stripeClient.prices.retrieve(price);
  const newAmount = (nextPrice.unit_amount ?? 0) * seats;
  const updated = await stripeClient.subscriptions.update(workspace.stripeSubscriptionId, {
    items: [{ id: item.id, price, quantity: seats }],
    proration_behavior: newAmount > oldAmount ? "always_invoice" : "none",
    metadata: { ...current.metadata, workspaceId: workspace.id, plan },
  });
  await applyStripeSubscription(updated, { workspaceId: workspace.id, plan });
  return pb().collection("workspaces").getOne<PbWorkspace>(workspace.id);
}

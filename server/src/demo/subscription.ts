import type { User } from "./types";

export type PlanId = "premium" | "pro" | "enterprise";

export interface Plan {
  id: PlanId;
  name: string;
  /** USD per seat per month, billed annually */
  pricePerSeat: number;
  tagline: string;
  inherits?: string;
  features: string[];
}

export const PLANS: Plan[] = [
  {
    id: "premium",
    name: "Premium",
    pricePerSeat: 7.99,
    tagline: "For small and mid-size business teams",
    features: [
      "Unlimited Projects",
      "Unlimited Boards",
      "Unlimited Tasks",
      "Coloured Cards & Labels",
      "Notes & Files",
      "Deep Integration with Google Workspace",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    pricePerSeat: 14.99,
    tagline: "For teams managing multiple projects",
    inherits: "Everything in Premium plus",
    features: [
      "Early Access To New Features",
      "Advanced Tracking",
      "Email Notifications",
      "Dark Mode",
      "Priority Support",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    pricePerSeat: 79.99,
    tagline: "For organizations requiring enterprise features",
    inherits: "Everything in Pro plus",
    features: [
      "Multiple Admins",
      "Onboarding Assistance",
      "Corporate Branding",
      "Custom Features & Integrations (at additional cost)",
      "Designated Account Manager",
    ],
  },
];

export const MIN_SEATS = 10;
export const MAX_SEATS = 150;

/** Premium and Pro top out at MAX_SEATS; Enterprise has no seat limit (null). */
export const planMaxSeats = (plan: PlanId): number | null =>
  plan === "enterprise" ? null : MAX_SEATS;

export const getPlan = (id: PlanId) => PLANS.find((p) => p.id === id) ?? PLANS[0]!;

/** Yearly total in USD. */
export const yearlyTotal = (plan: PlanId, seats: number) =>
  Math.round(getPlan(plan).pricePerSeat * seats * 12 * 100) / 100;

/** Keep a seat count within the plan's limits (Enterprise has no upper limit). */
export const clampSeats = (n: number, plan: PlanId = "premium") => {
  const max = planMaxSeats(plan) ?? Infinity;
  return Math.min(max, Math.max(MIN_SEATS, Math.round(n)));
};

/** Every user, admins included, takes one seat. */
export const INVITE_DAYS = 30;

/** Invites still waiting to be accepted (not yet past their 30 days). */
export const activeInvites = <I extends { expiresAt: string }>(
  invites: I[] = [],
  now = new Date(),
) => invites.filter((i) => new Date(i.expiresAt) > now);

export const canAddUser = (userCount: number, seats: number) => userCount < seats;

/** Extra seats an invite needs: none while a seat is free, otherwise one more. */
export const seatsNeededForInvite = (used: number, seats: number) => (used < seats ? 0 : 1);

/** Whether the plan can grow by one more seat (Premium/Pro stop at their limit). */
export const canAddSeat = (seats: number, plan: PlanId) => {
  const max = planMaxSeats(plan);
  return max === null || seats < max;
};

const DAY = 864e5;

/** A subscription renews once a year; new workspaces renew a year from today. */
export const defaultRenewal = (now = new Date()) =>
  new Date(now.getTime() + 365 * DAY).toISOString();

/** Days left in the current billing year (0–365). */
export const daysUntilRenewal = (renewsAt: string, now = new Date()) =>
  Math.min(365, Math.max(0, Math.ceil((new Date(renewsAt).getTime() - now.getTime()) / DAY)));

export interface BillingChange {
  /** Charged now: the extra cost for the days left until renewal. */
  dueToday: number;
  /** Charged at each renewal for the new plan and seats. */
  atRenewal: number;
  daysLeft: number;
}

/**
 * Adding seats or moving to a pricier plan is charged now, only for the extra
 * seats/price and only for the days left until renewal. Fewer seats or a cheaper
 * plan costs nothing today and lowers the next renewal.
 */
export function billingChange(
  from: { plan: PlanId; seats: number },
  to: { plan: PlanId; seats: number },
  renewsAt: string,
  now = new Date(),
): BillingChange {
  const atRenewal = yearlyTotal(to.plan, to.seats);
  const diff = atRenewal - yearlyTotal(from.plan, from.seats);
  const daysLeft = daysUntilRenewal(renewsAt, now);
  const dueToday = diff > 0 ? Math.round(((diff * daysLeft) / 365) * 100) / 100 : 0;
  return { dueToday, atRenewal, daysLeft };
}

export const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export const formatRenewal = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/** Seats can't go below the number of users already added. */
export function seatChangeError(
  newSeats: number,
  userCount: number,
  plan: PlanId = "premium",
): string | null {
  const max = planMaxSeats(plan);
  if (newSeats < MIN_SEATS) return `The minimum is ${MIN_SEATS} seats.`;
  if (max !== null && newSeats > max)
    return `${getPlan(plan).name} allows up to ${max} seats. Choose Enterprise for more.`;
  if (newSeats < userCount)
    return `You have ${userCount} users. Remove ${userCount - newSeats} user${userCount - newSeats === 1 ? "" : "s"} before reducing to ${newSeats} seats.`;
  return null;
}

/** Only Enterprise workspaces can have more than one admin, so only they pick roles. */
export const canChooseRole = (plan: PlanId) => plan === "enterprise";

/** Backups are on every plan; email notifications and dark mode need Pro or Enterprise. */
export const planAllows = (plan: PlanId, feature: "backups" | "emailNotifications" | "darkMode") =>
  feature === "backups" || plan === "pro" || plan === "enterprise";

/** Members are shown as "User" in the interface. */
export const roleLabel = (r: User["role"]) => (r === "Admin" ? "Admin" : "User");

export const isAdmin = (u?: User) => u?.role === "Admin";

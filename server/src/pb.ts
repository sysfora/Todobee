import PocketBase from "pocketbase";
import { env } from "./env.js";
import type { AppState } from "./demo/types.js";
import type { PlanId } from "./demo/subscription.js";

export interface PbUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  googleSub?: string;
  refreshToken?: string;
}

export interface PbWorkspace {
  id: string;
  name: string;
  owner: string;
  plan: PlanId;
  seats: number;
  subscribedAt?: string;
  renewsAt?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  driveFolderId?: string;
  driveFileId?: string;
  cache?: AppState;
  driveSynced?: boolean;
  status?: string;
}

export interface PbMember {
  id: string;
  workspace: string;
  user: string;
  role: "admin" | "member";
}

let client: PocketBase | null = null;

export function pb() {
  if (!client) throw new Error("PocketBase is not ready.");
  return client;
}

function quote(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

export async function findUserBy(field: "email" | "googleSub", value: string) {
  try {
    return await pb()
      .collection("users")
      .getFirstListItem<PbUser>(`${field}="${quote(value)}"`);
  } catch {
    return null;
  }
}

export async function membershipFor(userId: string) {
  try {
    return await pb()
      .collection("members")
      .getFirstListItem<PbMember>(`user="${quote(userId)}"`, { expand: "workspace" });
  } catch {
    return null;
  }
}

async function ensureSchema(db: PocketBase) {
  const users = await db.collections.getOne("users");
  const fields = (users.fields ?? []) as { name: string }[];
  const have = new Set(fields.map((field) => field.name));
  const extra = [
    have.has("name") ? null : { name: "name", type: "text", max: 200 },
    have.has("avatar") ? null : { name: "avatar", type: "text", max: 2000 },
    have.has("googleSub") ? null : { name: "googleSub", type: "text", max: 128 },
    have.has("refreshToken")
      ? null
      : { name: "refreshToken", type: "text", hidden: true, max: 5000 },
  ].filter(Boolean);
  if (extra.length) {
    await db.collections.update(users.id, { fields: [...fields, ...extra] });
  }

  const usersId = users.id;
  let workspacesId = "";
  try {
    workspacesId = (await db.collections.getOne("workspaces")).id;
  } catch {
    const created = await db.collections.create({
      name: "workspaces",
      type: "base",
      fields: [
        { name: "name", type: "text", required: true, max: 200 },
        { name: "owner", type: "relation", required: true, collectionId: usersId, maxSelect: 1 },
        {
          name: "plan",
          type: "select",
          maxSelect: 1,
          values: ["premium", "pro", "enterprise"],
        },
        { name: "seats", type: "number", min: 0 },
        { name: "subscribedAt", type: "date" },
        { name: "renewsAt", type: "date" },
        { name: "stripeCustomerId", type: "text", max: 200 },
        { name: "stripeSubscriptionId", type: "text", max: 200 },
        { name: "driveFolderId", type: "text", max: 200 },
        { name: "driveFileId", type: "text", max: 200 },
        { name: "cache", type: "json", maxSize: 8000000 },
        { name: "driveSynced", type: "bool" },
        {
          name: "status",
          type: "select",
          maxSelect: 1,
          values: ["inactive", "active", "past_due", "canceled"],
        },
      ],
    });
    workspacesId = created.id;
  }

  try {
    await db.collections.getOne("members");
  } catch {
    await db.collections.create({
      name: "members",
      type: "base",
      fields: [
        { name: "workspace", type: "relation", required: true, collectionId: workspacesId, maxSelect: 1 },
        { name: "user", type: "relation", required: true, collectionId: usersId, maxSelect: 1 },
        { name: "role", type: "select", maxSelect: 1, required: true, values: ["admin", "member"] },
      ],
      indexes: ["CREATE UNIQUE INDEX `idx_members_user` ON `members` (`user`)"],
    });
  }
}

export async function initPocketBase() {
  const url = env.pbUrl();
  if (!url) throw new Error("Set PB_URL to your PocketBase cloud URL.");
  if (!env.pbEmail() || !env.pbPassword()) {
    throw new Error("Set PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD for your PocketBase superuser.");
  }
  const health = await fetch(`${url}/api/health`).catch(() => null);
  if (!health?.ok) throw new Error(`PocketBase did not respond at ${url}.`);
  const db = new PocketBase(url);
  db.autoCancellation(false);
  await db.collection("_superusers").authWithPassword(env.pbEmail(), env.pbPassword());
  await ensureSchema(db);
  client = db;
  return db;
}

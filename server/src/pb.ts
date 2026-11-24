import PocketBase, { ClientResponseError, isTokenExpired, type SendOptions } from "pocketbase";
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
  isLifetimePaid?: boolean;
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
  driveSyncError?: string;
  cache?: AppState;
  cacheRevision?: number;
  driveSynced?: boolean;
  pendingDriveDeletes?: string[];
  status?: string;
}

export interface PbMember {
  id: string;
  workspace: string;
  user: string;
  role: "admin" | "member";
}

let client: PocketBase | null = null;
let refreshing: Promise<void> | null = null;

/** Re-authenticates the server's superuser client, coalescing concurrent refreshes. */
async function authenticateSuperuser(db: PocketBase) {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const auth = new PocketBase(db.baseURL);
    auth.autoCancellation(false);
    await auth.collection("_superusers").authWithPassword(env.pbEmail(), env.pbPassword());
    db.authStore.save(auth.authStore.token, auth.authStore.record);
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

function withAuthHeader(headers: SendOptions["headers"], token: string) {
  const next: Record<string, string> = {};
  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      if (key.toLowerCase() !== "authorization") next[key] = value;
    });
  } else if (Array.isArray(headers)) {
    for (const [key, value] of headers) {
      if (key.toLowerCase() !== "authorization") next[key] = value;
    }
  } else if (headers && typeof headers === "object") {
    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() !== "authorization" && typeof value === "string") {
        next[key] = value;
      }
    }
  }
  next.Authorization = token;
  return next;
}

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
  } catch (error) {
    if (error instanceof ClientResponseError && error.status === 404) return null;
    throw error;
  }
}

export async function membershipsFor(userId: string) {
  try {
    return await pb()
      .collection("members")
      .getFullList<PbMember>({ filter: `user="${quote(userId)}"`, expand: "workspace" });
  } catch {
    return [];
  }
}

export async function membershipFor(userId: string, workspaceId?: string) {
  const rows = await membershipsFor(userId);
  if (workspaceId) return rows.find((row) => row.workspace === workspaceId) ?? null;
  return rows[0] ?? null;
}

type PbField = { name: string; type?: string; max?: number; primaryKey?: boolean; system?: boolean };

/** Highest text length PocketBase will store. Zero means the 5,000 character default. */
const TEXT_MAX = 5_000_000;

function asFields(collection: { fields?: unknown }): PbField[] {
  return Array.isArray(collection.fields) ? (collection.fields as PbField[]) : [];
}

function withoutTextCaps(fields: PbField[]) {
  let changed = false;
  const next = fields.map((field) => {
    if (field.type !== "text" || field.primaryKey || field.system || field.name === "id") return field;
    if ((field.max ?? 0) >= TEXT_MAX) return field;
    changed = true;
    return { ...field, max: TEXT_MAX };
  });
  return { next, changed };
}

async function ensureSchema(db: PocketBase) {
  const users = await db.collections.getOne("users");
  const fields = asFields(users);
  const have = new Set(fields.map((field) => field.name));
  const extra = [
    have.has("name") ? null : { name: "name", type: "text", max: TEXT_MAX },
    have.has("avatar") ? null : { name: "avatar", type: "text", max: TEXT_MAX },
    have.has("googleSub") ? null : { name: "googleSub", type: "text", max: TEXT_MAX },
    have.has("isLifetimePaid") ? null : { name: "isLifetimePaid", type: "bool" },
    have.has("refreshToken")
      ? null
      : { name: "refreshToken", type: "text", hidden: true, max: TEXT_MAX },
  ].filter((field) => field !== null);
  const widened = withoutTextCaps(fields);
  if (extra.length || widened.changed) {
    await db.collections.update(users.id, { fields: [...widened.next, ...extra] });
  }

  const usersId = users.id;
  const workspaceFields = (usersIdForRelation: string) => [
    { name: "name", type: "text", required: true, max: TEXT_MAX },
    { name: "owner", type: "relation", required: true, collectionId: usersIdForRelation, maxSelect: 1 },
    {
      name: "plan",
      type: "select",
      maxSelect: 1,
      values: ["premium", "pro", "enterprise"],
    },
    { name: "seats", type: "number", min: 0 },
    { name: "subscribedAt", type: "date" },
    { name: "renewsAt", type: "date" },
    { name: "stripeCustomerId", type: "text", max: TEXT_MAX },
    { name: "stripeSubscriptionId", type: "text", max: TEXT_MAX },
    { name: "driveFolderId", type: "text", max: TEXT_MAX },
    { name: "driveFileId", type: "text", max: TEXT_MAX },
    { name: "driveSyncError", type: "text", max: TEXT_MAX },
    { name: "cache", type: "json", maxSize: 8000000 },
    { name: "cacheRevision", type: "number", min: 0 },
    { name: "driveSynced", type: "bool" },
    { name: "pendingDriveDeletes", type: "json", maxSize: 200000 },
    {
      name: "status",
      type: "select",
      maxSelect: 1,
      values: ["inactive", "active", "past_due", "canceled"],
    },
  ];
  let workspacesId = "";
  let existing: { id: string; fields?: { name: string }[] } | null = null;
  try {
    existing = await db.collections.getOne("workspaces");
  } catch {
    existing = null;
  }
  if (existing) {
    workspacesId = existing.id;
    const fields = asFields(existing);
    const have = new Set(fields.map((field) => field.name));
    const extra = workspaceFields(usersId).filter((field) => !have.has(field.name));
    const widened = withoutTextCaps(fields);
    if (extra.length || widened.changed) {
      await db.collections.update(existing.id, { fields: [...widened.next, ...extra] });
    }
  } else {
    const created = await db.collections.create({
      name: "workspaces",
      type: "base",
      fields: workspaceFields(usersId),
    });
    workspacesId = created.id;
  }

  const memberIndex = "CREATE UNIQUE INDEX `idx_members_workspace_user` ON `members` (`workspace`, `user`)";
  let members: { id: string; indexes?: string[] } | null = null;
  try {
    members = await db.collections.getOne("members");
  } catch {
    members = null;
  }
  if (!members) {
    await db.collections.create({
      name: "members",
      type: "base",
      fields: [
        { name: "workspace", type: "relation", required: true, collectionId: workspacesId, maxSelect: 1 },
        { name: "user", type: "relation", required: true, collectionId: usersId, maxSelect: 1 },
        { name: "role", type: "select", maxSelect: 1, required: true, values: ["admin", "member"] },
      ],
      indexes: [memberIndex],
    });
  } else {
    const indexes = members.indexes ?? [];
    const current = indexes.some((index) => index.includes("idx_members_workspace_user"));
    const blocksSecondWorkspace = indexes.some((index) => index.includes("idx_members_user"));
    if (!current || blocksSecondWorkspace) {
      await db.collections.update(members.id, { indexes: [memberIndex] });
    }
  }

  const licenseFields = [
    { name: "licenseKey", type: "text", required: true, max: TEXT_MAX },
    { name: "prevLicenseKey", type: "text", max: TEXT_MAX },
    { name: "parentLicenseKey", type: "text", max: TEXT_MAX },
    { name: "status", type: "select", maxSelect: 1, required: true, values: ["inactive", "active", "deactivated"] },
    { name: "tier", type: "number", min: 1 },
    { name: "plan", type: "select", maxSelect: 1, required: true, values: ["premium", "pro"] },
    { name: "seats", type: "number", min: 0 },
    { name: "extraSeats", type: "number", min: 0 },
    { name: "partnerPlanName", type: "text", max: TEXT_MAX },
    { name: "unitQuantity", type: "number", min: 0 },
    { name: "user", type: "relation", collectionId: usersId, maxSelect: 1 },
    { name: "userEmail", type: "text", max: TEXT_MAX },
    { name: "event", type: "text", max: TEXT_MAX },
  ];
  const licenseIndex = "CREATE UNIQUE INDEX `idx_appsumo_license_key` ON `appsumoLicenses` (`licenseKey`)";
  let licenses: { id: string; fields?: unknown; indexes?: string[] } | null = null;
  try {
    licenses = await db.collections.getOne("appsumoLicenses");
  } catch {
    licenses = null;
  }
  if (!licenses) {
    await db.collections.create({
      name: "appsumoLicenses",
      type: "base",
      fields: licenseFields,
      indexes: [licenseIndex],
    });
  } else {
    const fields = asFields(licenses);
    const have = new Set(fields.map((field) => field.name));
    const extra = licenseFields.filter((field) => !have.has(field.name));
    const widened = withoutTextCaps(fields);
    const indexes = licenses.indexes ?? [];
    const hasIndex = indexes.some((index) => index.includes("idx_appsumo_license_key"));
    if (extra.length || widened.changed || !hasIndex) {
      await db.collections.update(licenses.id, {
        ...(extra.length || widened.changed ? { fields: [...widened.next, ...extra] } : {}),
        ...(hasIndex ? {} : { indexes: [...indexes, licenseIndex] }),
      });
    }
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
  await authenticateSuperuser(db);
  db.beforeSend = async (requestUrl, options) => {
    if (!db.authStore.isSuperuser || isTokenExpired(db.authStore.token, 120)) {
      await authenticateSuperuser(db);
      options.headers = withAuthHeader(options.headers, db.authStore.token);
    }
    return { url: requestUrl, options };
  };
  db.afterSend = (response, data) => {
    if (response.status === 401 || response.status === 403) {
      db.authStore.clear();
    }
    return data;
  };
  await ensureSchema(db);
  client = db;
  return db;
}

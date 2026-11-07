import { randomBytes } from "node:crypto";
import http from "node:http";
import { Hono } from "hono";
import { getRequestListener } from "@hono/node-server";
import httpProxy from "http-proxy";
import { env } from "./env.js";
import { clearSessionCookie, encrypt, openJson, readCookie, sealJson, sessionCookie } from "./session.js";
import {
  findUserBy,
  initPocketBase,
  membershipFor,
  membershipsFor,
  pb,
  type PbMember,
  type PbUser,
  type PbWorkspace,
} from "./pb.js";
import { accessTokenFor, exchangeCode, googleAuthUrl, googleProfile, rememberAccess } from "./google.js";
import { downloadFile, ensureFolder, uploadFile } from "./drive.js";
import { startDriveSync, stopDriveSync, syncPendingWorkspaces } from "./drive-sync.js";
import { applyStripeSubscription, createCheckout, getStripe, updateSubscription } from "./billing.js";
import { claimIdentity, canReadFile, fileIds, initialWorkspaceState, mergeState, present, seatProblem, type Viewer } from "./state.js";
import { sendAssignmentEmail, sendInviteEmail, type MailResult } from "./mail.js";
import { withWorkspaceLock } from "./lock.js";
import type { AppState, Invite } from "./demo/types.js";
import type { PlanId } from "./demo/subscription.js";
import { clampSeats, MIN_SEATS } from "./demo/subscription.js";

const app = new Hono();

function safeNext(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/dashboard";
  }
  return value;
}

async function loadSession(cookie: string | undefined) {
  const token = readCookie(cookie, "tb_session");
  const session = openJson<{ uid: string; wid?: string }>(token);
  if (!session?.uid) return null;
  try {
    const user = await pb().collection("users").getOne<PbUser>(session.uid);
    const member = await membershipFor(user.id, session.wid);
    const workspace = member
      ? await pb().collection("workspaces").getOne<PbWorkspace>(member.workspace)
      : null;
    return { user, member, workspace };
  } catch {
    return null;
  }
}

function viewerOf(user: PbUser, member: PbMember): Viewer {
  return {
    id: user.id,
    name: user.name || user.email,
    email: user.email,
    avatar: user.avatar,
    role: member.role,
  };
}

function billingOf(workspace: PbWorkspace) {
  return {
    name: workspace.name,
    plan: workspace.plan || "premium",
    seats: workspace.seats || MIN_SEATS,
    renewsAt: workspace.renewsAt || null,
  };
}

function accountPayload(
  user: PbUser,
  member: PbMember,
  workspace: PbWorkspace,
  adminName: string,
  driveConnected: boolean,
  workspaces: { id: string; name: string; role: "admin" | "member" }[],
) {
  return {
    userId: user.id,
    name: user.name || user.email,
    email: user.email,
    avatarUrl: user.avatar || null,
    role: member.role,
    adminName,
    driveConnected,
    workspaces,
    workspace: {
      id: workspace.id,
      name: workspace.name,
      plan: workspace.plan,
      seats: workspace.seats,
      subscribedAt: workspace.subscribedAt || null,
      renewsAt: workspace.renewsAt || null,
    },
  };
}

async function adminNameFor(workspace: PbWorkspace, member: PbMember, user: PbUser) {
  if (member.role === "admin") return user.name || user.email;
  const owner = await pb().collection("users").getOne<PbUser>(workspace.owner);
  return owner.name || owner.email;
}

async function driveReady(workspace: PbWorkspace) {
  const owner = await pb().collection("users").getOne<PbUser>(workspace.owner);
  return Boolean(owner.refreshToken);
}

app.get("/api/health", async (c) => {
  let pocketbase = false;
  try {
    pocketbase = (await fetch(`${env.pbUrl()}/api/health`)).ok;
  } catch {
    pocketbase = false;
  }
  return c.json({ ok: true, pocketbase });
});

app.get("/api/auth/google", (c) => {
  if (!env.googleClientId() || !env.googleClientSecret()) {
    return c.json({ error: "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." }, 500);
  }
  const origin = env.requestOrigin((name) => c.req.header(name), c.req.url);
  const consent = c.req.query("consent") === "1";
  const state = sealJson({ next: safeNext(c.req.query("next")), origin, consentTried: consent }, 600);
  const authUrl = googleAuthUrl(state, origin, consent);
  console.log(`[Google OAuth] Redirecting to Google auth with redirect_uri: ${origin}/api/auth/google/callback`);
  return c.redirect(authUrl);
});

app.get("/api/auth/google/callback", async (c) => {
  const oauthError = c.req.query("error");
  const oauthDesc = c.req.query("error_description");
  const fallbackOrigin = env.requestOrigin((name) => c.req.header(name), c.req.url);
  if (oauthError) {
    console.error(`[Google OAuth Error] ${oauthError}: ${oauthDesc || "No description provided by Google"}`);
    return c.redirect(`${fallbackOrigin}/?auth_error=${encodeURIComponent(oauthError)}`);
  }
  const code = c.req.query("code") || "";
  const rawState = c.req.query("state");
  const state = openJson<{ next: string; origin?: string; consentTried?: boolean }>(rawState);
  const origin = state?.origin || fallbackOrigin;
  if (!code || !state) {
    console.error("[Google OAuth Error] Missing authorization code or invalid state token", {
      hasCode: Boolean(code),
      hasState: Boolean(rawState),
      stateVerified: Boolean(state),
    });
    return c.redirect(`${origin}/?auth_error=invalid_state`);
  }
  try {
    console.log("[Google OAuth] Exchanging code for tokens...");
    const tokens = await exchangeCode(code, origin);
    console.log("[Google OAuth] Fetching user profile...");
    const profile = await googleProfile(tokens.access_token!);
    console.log(`[Google OAuth] User authenticated: ${profile.email}`);
    let user = (await findUserBy("googleSub", profile.sub)) || (await findUserBy("email", profile.email));
    if (!tokens.refresh_token && !user?.refreshToken && !state.consentTried) {
      const retry = sealJson({ next: state.next, origin, consentTried: true }, 600);
      console.log("[Google OAuth] Drive access is not stored yet. Asking for permission once.");
      return c.redirect(googleAuthUrl(retry, origin, true));
    }
    const refresh = tokens.refresh_token ? encrypt(tokens.refresh_token) : user?.refreshToken || "";
    if (!user) {
      const password = randomBytes(18).toString("base64url");
      user = await pb().collection("users").create<PbUser>({
        email: profile.email,
        password,
        passwordConfirm: password,
        name: profile.name,
        avatar: profile.picture,
        googleSub: profile.sub,
        emailVisibility: true,
        verified: true,
        refreshToken: refresh,
      });
    } else {
      user = await pb().collection("users").update<PbUser>(user.id, {
        name: profile.name,
        avatar: profile.picture,
        googleSub: profile.sub,
        emailVisibility: true,
        verified: true,
        ...(tokens.refresh_token ? { refreshToken: refresh } : {}),
      });
    }
    rememberAccess(user.id, tokens.access_token!, tokens.expires_in);
    const joined = await acceptInvites(user);
    let member = joined[0] || (await membershipFor(user.id));
    if (!member) member = await createWorkspace(user);
    const workspace = await pb().collection("workspaces").getOne<PbWorkspace>(member.workspace);
    const home = member.role === "admin" ? "/dashboard" : "/projects";
    const dest = workspace.subscribedAt ? safeNext(state.next || home) : "/subscribe";
    c.header("set-cookie", sessionCookie(sealJson({ uid: user.id, wid: member.workspace }, 60 * 60 * 24 * 30), origin.startsWith("https://")));
    console.log(`[Google OAuth] Login successful for ${user.email}, redirecting to ${dest}`);
    return c.redirect(`${origin}${dest}`);
  } catch (error) {
    console.error("[Google OAuth Callback Error]:", error);
    const msg = error instanceof Error ? error.message : "server_error";
    return c.redirect(`${origin}/?auth_error=${encodeURIComponent(msg.slice(0, 60))}`);
  }
});

async function acceptInvites(user: PbUser): Promise<PbMember[]> {
  const existing = new Set((await membershipsFor(user.id)).map((member) => member.workspace));
  const rows = await pb().collection("workspaces").getFullList<PbWorkspace>();
  const hits: { workspace: PbWorkspace; invitedAt: string }[] = [];
  const email = user.email.toLowerCase();
  for (const workspace of rows) {
    if (!workspace.cache || existing.has(workspace.id)) continue;
    const invite = (workspace.cache.invites ?? []).find(
      (item) => item.email.toLowerCase() === email && new Date(item.expiresAt).getTime() > Date.now(),
    );
    const listed = workspace.cache.users.some((person) => person.email.toLowerCase() === email);
    if (!invite && !listed) continue;
    hits.push({ workspace, invitedAt: invite?.invitedAt ?? "" });
  }
  hits.sort((a, b) => b.invitedAt.localeCompare(a.invitedAt));
  const joined: PbMember[] = [];
  for (const hit of hits) {
    const claimed = claimIdentity(hit.workspace.cache!, {
      id: user.id,
      name: user.name || user.email,
      email: user.email,
      avatar: user.avatar,
    });
    if (!claimed) continue;
    const role = hit.workspace.owner === user.id ? "admin" : claimed.role;
    await pb().collection("workspaces").update(hit.workspace.id, {
      cache: claimed.state,
      driveSynced: false,
      cacheRevision: (hit.workspace.cacheRevision ?? 0) + 1,
    });
    joined.push(
      await pb().collection("members").create<PbMember>({
        workspace: hit.workspace.id,
        user: user.id,
        role,
      }),
    );
  }
  return joined;
}

async function createWorkspace(user: PbUser) {
  const state = initialWorkspaceState({
    id: user.id,
    name: user.name || user.email,
    email: user.email,
    avatar: user.avatar,
  });
  const workspace = await pb().collection("workspaces").create<PbWorkspace>({
    name: state.workspace.name,
    owner: user.id,
    plan: "premium",
    seats: Math.max(MIN_SEATS, state.users.length),
    status: "inactive",
    cache: state,
    cacheRevision: 1,
    driveSynced: false,
  });
  return await pb().collection("members").create<PbMember>({
    workspace: workspace.id,
    user: user.id,
    role: "admin",
  });
}

app.post("/api/auth/logout", (c) => {
  c.header("set-cookie", clearSessionCookie());
  return c.json({ ok: true });
});

app.get("/api/me", async (c) => {
  const session = await loadSession(c.req.header("cookie"));
  if (!session?.member || !session.workspace) return c.json({ error: "You're signed out." }, 401);
  const adminName = await adminNameFor(session.workspace, session.member, session.user);
  const memberships = await membershipsFor(session.user.id);
  const workspaces = await Promise.all(
    memberships.map(async (membership) => {
      const row = await pb().collection("workspaces").getOne<PbWorkspace>(membership.workspace);
      return { id: row.id, name: row.name, role: membership.role };
    }),
  );
  return c.json(
    accountPayload(
      session.user,
      session.member,
      session.workspace,
      adminName,
      await driveReady(session.workspace),
      workspaces,
    ),
  );
});

app.post("/api/workspaces/current", async (c) => {
  const session = await loadSession(c.req.header("cookie"));
  if (!session) return c.json({ error: "You're signed out." }, 401);
  const body = (await c.req.json().catch(() => null)) as { id?: string } | null;
  const memberships = await membershipsFor(session.user.id);
  const member = memberships.find((item) => item.workspace === body?.id);
  if (!member) return c.json({ error: "You aren't in that workspace." }, 404);
  const origin = env.requestOrigin((name) => c.req.header(name), c.req.url);
  c.header(
    "set-cookie",
    sessionCookie(sealJson({ uid: session.user.id, wid: member.workspace }, 60 * 60 * 24 * 30), origin.startsWith("https://")),
  );
  return c.json({ ok: true, home: member.role === "admin" ? "/dashboard" : "/projects" });
});

app.get("/api/workspace", async (c) => {
  const session = await loadSession(c.req.header("cookie"));
  if (!session?.member || !session.workspace) return c.json({ error: "You're signed out." }, 401);
  const workspace = session.workspace;
  const cache = workspace.cache || initialWorkspaceState({
    id: session.user.id,
    name: session.user.name || session.user.email,
    email: session.user.email,
    avatar: session.user.avatar,
  });
  return c.json({
    state: present(cache, viewerOf(session.user, session.member), billingOf(workspace)),
    revision: workspace.cacheRevision ?? 0,
    driveConnected: await driveReady(workspace),
  });
});

app.put("/api/workspace", async (c) => {
  const session = await loadSession(c.req.header("cookie"));
  if (!session?.member || !session.workspace) return c.json({ error: "You're signed out." }, 401);
  const body = (await c.req.json().catch(() => null)) as { state?: AppState; revision?: number } | AppState | null;
  const incoming = body && "state" in body ? body.state : (body as AppState | null);
  const revision = body && "state" in body ? Number(body.revision) : Number.NaN;
  if (!incoming?.projects || !incoming.tasks || !incoming.users) {
    return c.json({ error: "That workspace file isn't valid." }, 400);
  }
  const origin = env.requestOrigin((name) => c.req.header(name), c.req.url);
  try {
    return await withWorkspaceLock(session.workspace.id, async () => {
      let workspace = await pb().collection("workspaces").getOne<PbWorkspace>(session.workspace!.id);
      const viewer = viewerOf(session.user, session.member!);
      let billing = billingOf(workspace);
      const stored = workspace.cache || incoming;
      const currentRevision = workspace.cacheRevision ?? 0;
      if (!Number.isFinite(revision) || revision !== currentRevision) {
        return c.json(
          {
            error: "This workspace changed somewhere else.",
            state: present(stored, viewer, billing),
            revision: currentRevision,
          },
          409,
        );
      }
      if (
        stored.users.length > 0 &&
        incoming.users.length === 0 &&
        incoming.projects.length === 0 &&
        incoming.tasks.length === 0
      ) {
        return c.json({ error: "The workspace didn't load, so this empty copy wasn't saved." }, 409);
      }

      if (viewer.role === "admin") {
        const wanted = Math.round(Number(incoming.workspace?.seats));
        if (wanted && wanted !== workspace.seats) {
          const preview = mergeState(stored, incoming, viewer, { ...billing, seats: wanted });
          const problem = seatProblem(preview, wanted, billing.plan);
          if (problem) return c.json({ error: problem }, 400);
          try {
            if (workspace.stripeSubscriptionId) {
              workspace = await updateSubscription(workspace, billing.plan, wanted);
            } else {
              workspace = await pb().collection("workspaces").update<PbWorkspace>(workspace.id, { seats: wanted });
            }
            billing = billingOf(workspace);
          } catch (error) {
            const message = error instanceof Error ? error.message : "Stripe couldn't update the seats.";
            return c.json({ error: message }, 402);
          }
        }
      }

      const merged = stripFiles(mergeState(stored, incoming, viewer, billing), stored);
      const removed = [...fileIds(stored)].filter((id) => !fileIds(merged).has(id));
      const pendingDriveDeletes = [...new Set([...(workspace.pendingDriveDeletes ?? []), ...removed])];
      const nextRevision = currentRevision + 1;
      await pb().collection("workspaces").update(workspace.id, {
        name: merged.workspace.name,
        cache: merged,
        cacheRevision: nextRevision,
        driveSynced: false,
        pendingDriveDeletes,
      });
      const emails = [
        ...(await emailNewInvites(stored.invites ?? [], merged.invites ?? [], {
          workspaceName: merged.workspace.name,
          inviterName: viewer.name,
          origin,
        })),
        ...(await emailNewAssignments(stored, merged, viewer, billing.plan, origin)),
      ];
      const syncedFiles: Record<string, string> = {};
      for (const task of merged.tasks ?? []) {
        for (const file of task.files ?? []) {
          if (file.driveUrl) syncedFiles[file.id] = file.driveUrl;
        }
      }
      return c.json({ ok: true, pendingSync: true, syncedFiles, revision: nextRevision, emails });
    });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Couldn't save the workspace." }, 500);
  }
});

async function emailNewInvites(
  previous: Invite[],
  next: Invite[],
  meta: { workspaceName: string; inviterName: string; origin: string },
) {
  const prior = new Map(previous.map((invite) => [invite.id, invite.expiresAt]));
  const pending = next.filter((invite) => prior.get(invite.id) !== invite.expiresAt);
  return Promise.all(pending.map((invite) => sendInviteEmail({ invite, ...meta })));
}

async function emailNewAssignments(previous: AppState, next: AppState, viewer: Viewer, plan: PlanId, origin: string) {
  if (plan !== "pro" && plan !== "enterprise") return [];
  const before = new Map(previous.tasks.map((task) => [task.id, new Set(task.assigneeIds)]));
  const results: MailResult[] = [];
  for (const task of next.tasks) {
    const prior = before.get(task.id) ?? new Set<string>();
    for (const userId of task.assigneeIds) {
      if (prior.has(userId) || userId === viewer.id) continue;
      const person = next.users.find((user) => user.id === userId);
      const prefs = next.notificationPrefs?.[userId];
      if (!person?.email || !prefs?.email || prefs.assigned === false) continue;
      results.push(
        await sendAssignmentEmail({
          to: person.email,
          name: person.name || person.email,
          taskTitle: task.title || "a task",
          workspaceName: next.workspace.name,
          origin,
        }),
      );
    }
  }
  return results;
}

function stripFiles(state: AppState, stored?: AppState): AppState {
  const existingDriveUrls = new Map<string, string>();
  for (const task of stored?.tasks ?? []) {
    for (const file of task.files ?? []) {
      if (file.driveUrl) existingDriveUrls.set(file.id, file.driveUrl);
    }
  }
  return {
    ...state,
    tasks: state.tasks.map((task) => ({
      ...task,
      files: (task.files ?? []).map((file) => {
        const driveUrl = file.driveUrl || existingDriveUrls.get(file.id);
        return driveUrl ? { ...file, driveUrl, dataUrl: undefined } : file;
      }),
    })),
  };
}

app.post("/api/files", async (c) => {
  const session = await loadSession(c.req.header("cookie"));
  if (!session?.workspace) return c.json({ error: "You're signed out." }, 401);
  const body = (await c.req.json().catch(() => null)) as {
    name?: string;
    mimeType?: string;
    dataUrl?: string;
  } | null;
  const match = body?.dataUrl?.match(/^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!body?.name || !match) return c.json({ error: "Choose a file to upload." }, 400);
  const data = Buffer.from(match[2], "base64");
  if (data.length > 8_000_000) return c.json({ error: "Files need to be 8 MB or smaller." }, 413);
  try {
    const owner = await pb().collection("users").getOne<PbUser>(session.workspace.owner);
    const token = await accessTokenFor(owner);
    if (!token) return c.json({ error: "Connect Google Drive before uploading files." }, 409);
    const folder = await ensureFolder(token, session.workspace.driveFolderId);
    if (folder !== session.workspace.driveFolderId) {
      await pb().collection("workspaces").update(session.workspace.id, { driveFolderId: folder });
    }
    const id = await uploadFile(token, folder, body.name.slice(0, 180), body.mimeType || match[1], data);
    return c.json({ driveUrl: `/api/files/${id}` });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Google Drive didn't accept that file." }, 502);
  }
});

app.get("/api/files/:id", async (c) => {
  const session = await loadSession(c.req.header("cookie"));
  if (!session?.workspace?.cache || !session.member) return c.json({ error: "You're signed out." }, 401);
  const id = c.req.param("id");
  if (!canReadFile(session.workspace.cache, viewerOf(session.user, session.member), id)) {
    return c.json({ error: "File not found." }, 404);
  }
  try {
    const owner = await pb().collection("users").getOne<PbUser>(session.workspace.owner);
    const token = await accessTokenFor(owner);
    if (!token) return c.json({ error: "Google Drive isn't connected." }, 409);
    const file = await downloadFile(token, id);
    return new Response(file.body, {
      headers: {
        "content-type": file.headers.get("content-type") || "application/octet-stream",
        "cache-control": "private, max-age=60",
      },
    });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Couldn't read that file from Google Drive." }, 502);
  }
});

app.post("/api/billing/checkout", async (c) => {
  const session = await loadSession(c.req.header("cookie"));
  if (!session?.member || !session.workspace) return c.json({ error: "You're signed out." }, 401);
  if (session.member.role !== "admin") return c.json({ error: "Only an admin can subscribe." }, 403);
  const body = (await c.req.json().catch(() => null)) as { plan?: PlanId; seats?: number } | null;
  const plan = body?.plan === "pro" || body?.plan === "enterprise" ? body.plan : "premium";
  if (plan === "enterprise") {
    return c.json({ error: "Enterprise is set up with our team. Email help@todobee.com." }, 400);
  }
  const seats = clampSeats(Number(body?.seats) || MIN_SEATS, plan);
  try {
    const origin = env.requestOrigin((name) => c.req.header(name), c.req.url);
    const url = await createCheckout(session.workspace, session.user.email, plan, seats, origin);
    return c.json({ url });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : "Stripe checkout failed." }, 502);
  }
});

app.post("/api/billing/update", async (c) => {
  const session = await loadSession(c.req.header("cookie"));
  if (!session?.member || !session.workspace) return c.json({ error: "You're signed out." }, 401);
  if (session.member.role !== "admin") return c.json({ error: "Only an admin can change the subscription." }, 403);
  const body = (await c.req.json().catch(() => null)) as { plan?: PlanId; seats?: number } | null;
  const plan = body?.plan === "pro" || body?.plan === "premium" ? body.plan : session.workspace.plan;
  if (body?.plan === "enterprise") {
    return c.json({ error: "Enterprise is set up with our team. Email help@todobee.com." }, 400);
  }
  const seats = clampSeats(Number(body?.seats) || session.workspace.seats, plan);
  const problem = seatProblem(
    session.workspace.cache ||
      ({ users: [], invites: [], tasks: [], projects: [], sections: [], labels: [] } as unknown as AppState),
    seats,
    plan,
  );
  if (problem) return c.json({ error: problem }, 400);
  try {
    const workspace = await updateSubscription(session.workspace, plan, seats);
    return c.json({
      plan: workspace.plan,
      seats: workspace.seats,
      renewsAt: workspace.renewsAt || null,
      name: workspace.name,
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : "Stripe update failed." }, 402);
  }
});

app.post("/api/billing/confirm", async (c) => {
  const session = await loadSession(c.req.header("cookie"));
  if (!session?.workspace) return c.json({ error: "You're signed out." }, 401);
  const stripe = getStripe();
  if (!stripe) return c.json({ error: "Stripe is not configured." }, 500);
  const body = (await c.req.json().catch(() => null)) as { sessionId?: string } | null;
  if (!body?.sessionId) return c.json({ error: "Missing checkout session." }, 400);
  const checkout = await stripe.checkout.sessions.retrieve(body.sessionId);
  if (checkout.metadata?.workspaceId !== session.workspace.id) return c.json({ error: "That checkout belongs to another workspace." }, 403);
  const subscriptionId = typeof checkout.subscription === "string" ? checkout.subscription : checkout.subscription?.id;
  if (!subscriptionId) return c.json({ error: "Stripe hasn't created the subscription yet." }, 409);
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await applyStripeSubscription(subscription, {
    workspaceId: session.workspace.id,
    plan: checkout.metadata?.plan,
  });
  return c.json({ ok: true });
});

app.post("/api/stripe/webhook", async (c) => {
  const stripe = getStripe();
  const secret = env.stripeWebhookSecret();
  if (!stripe || !secret) return c.json({ error: "Stripe webhook is not configured." }, 500);
  const signature = c.req.header("stripe-signature") || "";
  let event;
  try {
    event = stripe.webhooks.constructEvent(await c.req.text(), signature, secret);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : "Invalid signature." }, 400);
  }
  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      if (event.type === "checkout.session.completed") {
        const checkout = event.data.object;
        const subscriptionId =
          typeof checkout.subscription === "string" ? checkout.subscription : checkout.subscription?.id;
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await applyStripeSubscription(subscription, {
            workspaceId: checkout.metadata?.workspaceId,
            plan: checkout.metadata?.plan,
          });
        }
      } else {
        await applyStripeSubscription(event.data.object);
      }
    } else if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
      const invoice = event.data.object;
      const parent = invoice.parent?.subscription_details?.subscription;
      const subscriptionId = typeof parent === "string" ? parent : parent?.id;
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        if (event.type === "invoice.payment_failed") {
          const workspaceId = subscription.metadata.workspaceId;
          if (workspaceId) await pb().collection("workspaces").update(workspaceId, { status: "past_due" });
        } else {
          await applyStripeSubscription(subscription);
        }
      }
    }
  } catch (error) {
    console.error(event.type, error);
    return c.json({ error: "Webhook handler failed." }, 500);
  }
  return c.json({ received: true });
});

const listener = getRequestListener(app.fetch);
const proxy = httpProxy.createProxyServer({
  target: process.env.NEXT_ORIGIN || "http://127.0.0.1:3000",
});

await initPocketBase();
startDriveSync();

function forwardToNext(req: http.IncomingMessage, res: http.ServerResponse, attempts = 0) {
  proxy.web(req, res, undefined, (error) => {
    if ((error as any)?.code === "ECONNREFUSED" && attempts < 5 && !res.headersSent) {
      setTimeout(() => forwardToNext(req, res, attempts + 1), 600);
      return;
    }
    console.error(error);
    if (!res.headersSent) {
      res.statusCode = 502;
      res.end("Next.js isn't running.");
    }
  });
}

const server = http.createServer((req, res) => {
  const url = req.url || "/";
  if (url.startsWith("/api") || process.env.PROXY_NEXT !== "1") {
    listener(req, res);
    return;
  }
  forwardToNext(req, res);
});

server.on("upgrade", (req, socket, head) => {
  if (process.env.PROXY_NEXT === "1") proxy.ws(req, socket, head);
});

server.listen(env.port(), "0.0.0.0", () => {
  console.log(`Todobee API on 0.0.0.0:${env.port()}`);
});

function shutdown() {
  stopDriveSync();
  server.close();
  const force = setTimeout(() => process.exit(0), 20_000);
  force.unref();
  void syncPendingWorkspaces()
    .then(() => syncPendingWorkspaces())
    .finally(() => process.exit(0));
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

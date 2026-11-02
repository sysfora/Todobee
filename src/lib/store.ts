import { useSyncExternalStore } from "react";
import { createSeed, CURRENT_USER_ID } from "./seed";
import type {
  AppState,
  Invite,
  Label,
  NotificationPrefs,
  Project,
  Section,
  Task,
  User,
  Workspace,
} from "./types";
import {
  INVITE_DAYS,
  activeInvites,
  canAddSeat,
  canAddUser,
  defaultRenewal,
  getPlan,
  planMaxSeats,
  seatChangeError,
  type PlanId,
} from "./subscription";
import {
  canWorkInProject,
  isAdminUser,
  sanitizeBackup,
  withSignedInRole,
  wouldRemoveLastAdmin,
  type AccountRole,
} from "./permissions";
import { playCompleteSound } from "./sounds";
import { toast } from "sonner";

export const DEFAULT_PREFS: NotificationPrefs = {
  dueToday: true,
  overdue: true,
  assigned: true,
  email: false,
};

function emptyState(): AppState {
  return {
    currentUserId: "",
    workspace: { name: "", plan: "premium", seats: 10 },
    notificationPrefs: {},
    users: [],
    invites: [],
    labels: [],
    projects: [],
    sections: [],
    tasks: [],
  };
}

let state: AppState = emptyState();
let hydrated = false;
let remoteReady = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pushing = false;
let pushAgain = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

function persist() {
  if (!remoteReady || typeof window === "undefined") return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void pushState();
  }, 700);
}

async function uploadPendingFiles(snapshot: AppState): Promise<AppState> {
  let changed = false;
  const tasks = await Promise.all(
    snapshot.tasks.map(async (task) => {
      const files = await Promise.all(
        (task.files ?? []).map(async (file) => {
          if (!file.dataUrl || file.driveUrl) return file;
          const res = await fetch("/api/files", {
            method: "POST",
            credentials: "include",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              name: file.name,
              mimeType: file.mimeType,
              dataUrl: file.dataUrl,
            }),
          });
          if (!res.ok) return file;
          const body = (await res.json()) as { driveUrl?: string };
          if (!body.driveUrl) return file;
          changed = true;
          return { ...file, driveUrl: body.driveUrl, dataUrl: undefined };
        }),
      );
      return { ...task, files };
    }),
  );
  return changed ? { ...snapshot, tasks } : snapshot;
}

async function pushState() {
  if (pushing) {
    pushAgain = true;
    return;
  }
  pushing = true;
  try {
    const prepared = await uploadPendingFiles(state);
    if (prepared !== state) {
      state = prepared;
      emit();
    }
    const res = await fetch("/api/workspace", {
      method: "PUT",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(state),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error("Couldn't save your changes", {
        description: body.error ?? "Check your connection and try again.",
      });
    } else {
      const body = (await res.json().catch(() => ({}))) as { driveSynced?: boolean };
      if (body.driveSynced === false) {
        toast.error("Saved, but Google Drive didn't update", {
          description: "We'll try again the next time you make a change.",
        });
      }
    }
  } catch {
    toast.error("Couldn't save your changes", {
      description: "Check your connection and try again.",
    });
  } finally {
    pushing = false;
    if (pushAgain) {
      pushAgain = false;
      void pushState();
    }
  }
}

function set(updater: (s: AppState) => AppState) {
  const next = updater(state);
  if (next === state) return;
  state = next;
  persist();
  emit();
}

/** Older saves used Manager/User roles; everyone who isn't an Admin is now a Member. */
function migrate(s: AppState): AppState {
  const ws = s.workspace ?? { name: "Todobee Workspace", plan: "premium", seats: 10 };
  return {
    ...s,
    workspace: { ...ws, renewsAt: ws.renewsAt ?? defaultRenewal() },
    notificationPrefs: s.notificationPrefs ?? {},
    users: s.users.map((u) => (u.role === "Admin" ? u : { ...u, role: "Member" })),
    projects: s.projects.map((p) => ({
      ...p,
      favoriteBy: p.favoriteBy ?? (p.favorite ? [s.currentUserId] : []),
    })),
    tasks: s.tasks.map((t) => ({ ...t, files: t.files ?? [] })),
  };
}

/**
 * Load saved data from the browser. Call once on mount. `role` is the signed-in
 * person's role from their account, which decides what they can open and see.
 */
let inflight: Promise<void> | null = null;
let pendingRole: AccountRole | undefined;

export function hydrateStore(role?: AccountRole) {
  if (role) pendingRole = role;
  if (hydrated) {
    if (role) actions.syncSignedInRole(role);
    return Promise.resolve();
  }
  if (!inflight) {
    inflight = (async () => {
      try {
        const res = await fetch("/api/workspace", { credentials: "include" });
        if (res.ok) {
          const data = (await res.json()) as { state: AppState };
          state = migrate(data.state);
        }
      } catch {
        state = emptyState();
      }
      if (pendingRole) state = withSignedInRole(state, pendingRole);
      hydrated = true;
      remoteReady = true;
      emit();
    })();
  }
  return inflight;
}

/** Members only see projects they've been added to (and those projects' sections and tasks). */
export function visibleTo(s: AppState): AppState {
  const me = s.users.find((u) => u.id === s.currentUserId);
  const withFav = [...s.projects]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((p) => ({
      ...p,
      favorite: (p.favoriteBy ?? []).includes(s.currentUserId),
    }));
  const labels = [...s.labels].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
  if (!me || me.role === "Admin") return { ...s, projects: withFav, labels };
  const projects = withFav.filter((p) => p.memberIds.includes(me.id));
  const ids = new Set(projects.map((p) => p.id));
  return {
    ...s,
    labels,
    projects,
    sections: s.sections.filter((x) => ids.has(x.projectId)),
    tasks: s.tasks.filter((t) => ids.has(t.projectId)),
  };
}

let viewSource: AppState | null = null;
let view: AppState = state;
const getView = () => {
  if (viewSource !== state) {
    viewSource = state;
    view = visibleTo(state);
  }
  return view;
};

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getView, getView);
}

export function useStoreHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => hydrated,
    () => false,
  );
}

export const getState = () => state;

export const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

export const actions = {
  /** Match the signed-in person's role in the app to their account (set by the database). */
  syncSignedInRole(role: AccountRole) {
    const next = withSignedInRole(state, role);
    if (next !== state) set(() => next);
  },
  resetDemo() {
    if (!isAdminUser(state)) return;
    const me = state.users.find((u) => u.id === state.currentUserId);
    const billing = state.workspace;
    set(() => {
      const seed = createSeed();
      if (!me) return seed;
      const next = JSON.parse(JSON.stringify(seed).split(CURRENT_USER_ID).join(me.id)) as AppState;
      next.currentUserId = me.id;
      next.users = next.users.map((u) =>
        u.id === me.id ? { ...u, name: me.name, email: me.email, avatar: me.avatar, role: "Admin" } : u,
      );
      next.workspace = { ...next.workspace, ...billing, name: billing.name || next.workspace.name };
      return next;
    });
  },

  // Projects
  createProject(input: Pick<Project, "name" | "color" | "memberIds">): string {
    const id = uid("p");
    if (!isAdminUser(state)) return id;
    set((s) => ({
      ...s,
      projects: [
        ...s.projects,
        { ...input, id, favorite: false, favoriteBy: [], createdAt: new Date().toISOString() },
      ],
    }));
    return id;
  },
  updateProject(id: string, patch: Partial<Project>) {
    if (!isAdminUser(state)) return;
    set((s) => ({
      ...s,
      projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  },
  /** Anyone can star a project they can see; users only see projects they were added to. */
  toggleFavorite(id: string) {
    if (!canWorkInProject(state, id)) return;
    set((s) => ({
      ...s,
      projects: s.projects.map((p) => {
        if (p.id !== id) return p;
        const by = p.favoriteBy ?? [];
        const me = s.currentUserId;
        return { ...p, favoriteBy: by.includes(me) ? by.filter((x) => x !== me) : [...by, me] };
      }),
    }));
  },
  deleteProject(id: string) {
    if (!isAdminUser(state)) return;
    set((s) => ({
      ...s,
      projects: s.projects.filter((p) => p.id !== id),
      sections: s.sections.filter((x) => x.projectId !== id),
      tasks: s.tasks.filter((t) => t.projectId !== id),
    }));
  },

  // Sections
  createSection(projectId: string, name: string) {
    if (!canWorkInProject(state, projectId)) return;
    set((s) => {
      const max = Math.max(
        -1,
        ...s.sections.filter((x) => x.projectId === projectId).map((x) => x.order),
      );
      return {
        ...s,
        sections: [...s.sections, { id: uid("s"), projectId, name, order: max + 1 }],
      };
    });
  },
  renameSection(id: string, name: string) {
    if (!sectionAllowed(id)) return;
    set((s) => ({
      ...s,
      sections: s.sections.map((x) => (x.id === id ? { ...x, name } : x)),
    }));
  },
  deleteSection(id: string) {
    if (!sectionAllowed(id)) return;
    set((s) => ({
      ...s,
      sections: s.sections.filter((x) => x.id !== id),
      tasks: s.tasks.filter((t) => t.sectionId !== id),
    }));
  },

  // Tasks
  createTask(projectId: string, sectionId: string, title: string): string {
    const id = uid("t");
    if (!canWorkInProject(state, projectId)) return id;
    set((s) => {
      const max = Math.max(
        -1,
        ...s.tasks.filter((t) => t.sectionId === sectionId).map((t) => t.order),
      );
      const task: Task = {
        id,
        projectId,
        sectionId,
        title,
        description: "",
        completed: false,
        priority: "none",
        assigneeIds: [],
        labelIds: [],
        checklist: [],
        comments: [],
        files: [],
        order: max + 1,
        createdAt: new Date().toISOString(),
      };
      return { ...s, tasks: [...s.tasks, task] };
    });
    return id;
  },
  updateTask(id: string, patch: Partial<Task>) {
    if (!taskAllowed(id)) return;
    set((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  },
  toggleTaskComplete(id: string) {
    if (!taskAllowed(id)) return;
    const completing = !state.tasks.find((t) => t.id === id)?.completed;
    set((s) => ({
      ...s,
      tasks: s.tasks.map((t) =>
        t.id === id
          ? {
              ...t,
              completed: !t.completed,
              completedAt: !t.completed ? new Date().toISOString() : undefined,
            }
          : t,
      ),
    }));
    if (completing) playCompleteSound();
  },
  deleteTask(id: string) {
    if (!taskAllowed(id)) return;
    set((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));
  },
  /** Move a task into a section, placed before `beforeId` (or at the end). */
  moveTask(taskId: string, sectionId: string, beforeId: string | null) {
    if (!taskAllowed(taskId) || !sectionAllowed(sectionId)) return;
    set((s) => {
      const moving = s.tasks.find((t) => t.id === taskId);
      if (!moving || taskId === beforeId) return s;
      const column = s.tasks
        .filter((t) => t.sectionId === sectionId && t.id !== taskId)
        .sort((a, b) => a.order - b.order);
      const idx = beforeId ? column.findIndex((t) => t.id === beforeId) : -1;
      column.splice(idx === -1 ? column.length : idx, 0, { ...moving, sectionId });
      const orders = new Map(column.map((t, i) => [t.id, i]));
      return {
        ...s,
        tasks: s.tasks.map((t) =>
          orders.has(t.id) ? { ...t, sectionId, order: orders.get(t.id)! } : t,
        ),
      };
    });
  },

  // Users
  /** Returns false when every seat is already taken. */
  createUser(input: Omit<User, "id">): boolean {
    if (!isAdminUser(state)) return false;
    // Pending invites hold seats too
    if (
      !canAddUser(state.users.length + activeInvites(state.invites).length, state.workspace.seats)
    )
      return false;
    set((s) => ({ ...s, users: [...s.users, { ...input, id: uid("u") }] }));
    return true;
  },

  /**
   * Invite someone by email; every pending invite takes a seat. When every seat is
   * taken, the admin must approve adding one (`addSeat`). Returns an error message or null.
   */
  inviteUser(
    input: Pick<Invite, "name" | "email" | "role">,
    opts: { addSeat?: boolean } = {},
  ): string | null {
    if (!isAdminUser(state)) return "Only admins can invite users.";
    const email = input.email.trim().toLowerCase();
    const pending = activeInvites(state.invites);
    if (state.users.some((u) => u.email.toLowerCase() === email))
      return "This person is already in your workspace.";
    if (pending.some((i) => i.email.toLowerCase() === email))
      return "This person has already been invited.";
    const { plan, seats } = state.workspace;
    const full = !canAddUser(state.users.length + pending.length, seats);
    if (full && !canAddSeat(seats, plan))
      return `${getPlan(plan).name} allows up to ${planMaxSeats(plan)} seats. Choose Enterprise for more.`;
    if (full && !opts.addSeat) return "All your seats are in use. Add a seat to invite more users.";
    const now = new Date();
    const invite: Invite = {
      ...input,
      email,
      id: uid("i"),
      invitedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + INVITE_DAYS * 864e5).toISOString(),
    };
    set((s) => ({
      ...s,
      workspace: full ? { ...s.workspace, seats: s.workspace.seats + 1 } : s.workspace,
      invites: [...activeInvites(s.invites), invite],
    }));
    return null;
  },
  revokeInvite(id: string) {
    if (!isAdminUser(state)) return;
    set((s) => ({ ...s, invites: (s.invites ?? []).filter((i) => i.id !== id) }));
  },
  /** Restart the 30 days for a pending invite. */
  resendInvite(id: string) {
    if (!isAdminUser(state)) return;
    const expiresAt = new Date(Date.now() + INVITE_DAYS * 864e5).toISOString();
    set((s) => ({
      ...s,
      invites: (s.invites ?? []).map((i) => (i.id === id ? { ...i, expiresAt } : i)),
    }));
  },

  // Workspace & subscription
  updateWorkspace(patch: Partial<Workspace>) {
    if (!isAdminUser(state)) return;
    set((s) => ({ ...s, workspace: { ...s.workspace, ...patch } }));
  },
  /** Match the workspace subscription (plan, seats, renewal) to the signed-in account's workspace. */
  syncWorkspace(ws: { plan: PlanId; seats: number; renewsAt?: string | null; name?: string }) {
    const apply = () =>
      set((s) => {
        const renewsAt = ws.renewsAt ?? s.workspace.renewsAt ?? defaultRenewal();
        const name = ws.name || s.workspace.name;
        if (
          s.workspace.plan === ws.plan &&
          s.workspace.seats === ws.seats &&
          s.workspace.renewsAt === renewsAt &&
          s.workspace.name === name
        ) {
          return s;
        }
        return {
          ...s,
          workspace: { ...s.workspace, plan: ws.plan, seats: ws.seats, renewsAt, name },
        };
      });
    if (!hydrated) {
      void hydrateStore().then(apply);
      return;
    }
    apply();
  },
  /** Returns an error message instead of saving when the change isn't allowed. */
  setSeats(seats: number, plan: PlanId = state.workspace.plan): string | null {
    if (!isAdminUser(state)) return "Only admins can change seats.";
    const used = state.users.length + activeInvites(state.invites).length;
    const err = seatChangeError(seats, used, plan);
    if (err) return err;
    set((s) => ({ ...s, workspace: { ...s.workspace, seats } }));
    return null;
  },
  setNotificationPrefs(userId: string, patch: Partial<NotificationPrefs>) {
    set((s) => ({
      ...s,
      notificationPrefs: {
        ...s.notificationPrefs,
        [userId]: { ...DEFAULT_PREFS, ...s.notificationPrefs[userId], ...patch },
      },
    }));
  },

  // Labels
  createLabel(input: Omit<Label, "id">) {
    if (!isAdminUser(state)) return;
    set((s) => ({ ...s, labels: [...s.labels, { ...input, id: uid("l") }] }));
  },
  updateLabel(id: string, patch: Partial<Label>) {
    if (!isAdminUser(state)) return;
    set((s) => ({ ...s, labels: s.labels.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));
  },
  deleteLabel(id: string) {
    if (!isAdminUser(state)) return;
    set((s) => ({
      ...s,
      labels: s.labels.filter((l) => l.id !== id),
      tasks: s.tasks.map((t) => ({ ...t, labelIds: t.labelIds.filter((x) => x !== id) })),
    }));
  },
  /** Throws when the file isn't a valid backup. */
  importBackup(data: unknown) {
    if (!isAdminUser(state)) throw new Error("Only admins can restore backups");
    const clean = migrate(sanitizeBackup(data));
    set(() => clean);
  },
  /** Members may only edit their own name and picture; the last admin can't be demoted. */
  updateUser(id: string, patch: Partial<User>): boolean {
    const admin = isAdminUser(state);
    if (!admin && id !== state.currentUserId) return false;
    if (!admin) patch = pick(patch);
    if (patch.role && wouldRemoveLastAdmin(state.users, id, patch.role)) return false;
    set((s) => ({ ...s, users: s.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) }));
    return true;
  },
  deleteUser(id: string): boolean {
    if (!isAdminUser(state) || id === state.currentUserId) return false;
    if (wouldRemoveLastAdmin(state.users, id)) return false;
    set((s) => ({
      ...s,
      users: s.users.filter((u) => u.id !== id),
      projects: s.projects.map((p) => ({ ...p, memberIds: p.memberIds.filter((m) => m !== id) })),
      tasks: s.tasks.map((t) => ({ ...t, assigneeIds: t.assigneeIds.filter((a) => a !== id) })),
    }));
    return true;
  },
};

function taskAllowed(id: string) {
  const t = state.tasks.find((x) => x.id === id);
  return !!t && canWorkInProject(state, t.projectId);
}
function sectionAllowed(id: string) {
  const x = state.sections.find((y) => y.id === id);
  return !!x && canWorkInProject(state, x.projectId);
}
/** Keep only the profile fields a member may change about themselves. */
function pick(p: Partial<User>): Partial<User> {
  const out: Partial<User> = {};
  if ("name" in p) out.name = p.name;
  if ("avatar" in p) out.avatar = p.avatar;
  return out;
}

export type { Section };

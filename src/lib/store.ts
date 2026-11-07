import { useSyncExternalStore } from "react";
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
import { rebaseWorkspace } from "./rebase";
import { isDemo, loadDemoBoard, saveDemoBoard } from "./demo-mode";
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
let baseState: AppState = emptyState();
let baseRevision = 0;
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
    if (isDemo) saveDemoBoard(state);
    else void pushState();
  }, isDemo ? 200 : 700);
}

function applySyncedFiles(snapshot: AppState, syncedFiles?: Record<string, string>): AppState {
  if (!syncedFiles || Object.keys(syncedFiles).length === 0) return snapshot;
  let changed = false;
  const tasks = snapshot.tasks.map((task) => {
    let taskChanged = false;
    const files = (task.files ?? []).map((file) => {
      const driveUrl = syncedFiles[file.id];
      if (!driveUrl || (file.driveUrl === driveUrl && !file.dataUrl)) return file;
      changed = true;
      taskChanged = true;
      return { ...file, driveUrl, dataUrl: undefined };
    });
    return taskChanged ? { ...task, files } : task;
  });
  return changed ? { ...snapshot, tasks } : snapshot;
}

type MailNotice = { kind: "invite" | "assignment"; to: string; ok: boolean; error?: string };

function rememberSaved(next: AppState, revision: number) {
  state = next;
  baseState = structuredClone(next);
  baseRevision = revision;
}

function reportMail(emails: MailNotice[] | undefined) {
  for (const mail of emails ?? []) {
    if (mail.kind === "invite" && mail.ok) toast.success(`Emailed ${mail.to}`);
    if (!mail.ok) toast.error(`Couldn't email ${mail.to}`, { description: mail.error });
  }
}

async function pushState(attempt = 0) {
  if (!remoteReady) return;
  if (pushing) {
    pushAgain = true;
    return;
  }
  pushing = true;
  const sent = state;
  let retryMerged = false;
  try {
    const res = await fetch("/api/workspace", {
      method: "PUT",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ state: sent, revision: baseRevision }),
    });
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      state?: AppState;
      revision?: number;
      syncedFiles?: Record<string, string>;
      emails?: MailNotice[];
    };
    if (res.status === 409 && body.state && typeof body.revision === "number" && attempt < 4) {
      const merged = rebaseWorkspace(baseState, state, migrate(body.state));
      rememberSaved(merged, body.revision);
      emit();
      retryMerged = JSON.stringify(merged) !== JSON.stringify(migrate(body.state));
    } else if (!res.ok) {
      toast.error("Couldn't save your changes", {
        description: body.error ?? "Check your connection and try again.",
      });
    } else {
      const next = applySyncedFiles(state === sent ? sent : state, body.syncedFiles);
      rememberSaved(next, typeof body.revision === "number" ? body.revision : baseRevision);
      if (next !== sent) emit();
      reportMail(body.emails);
    }
  } catch {
    toast.error("Couldn't save your changes", {
      description: "Check your connection and try again.",
    });
  } finally {
    pushing = false;
  }
  if (retryMerged) {
    await pushState(attempt + 1);
    return;
  }
  if (pushAgain) {
    pushAgain = false;
    void pushState();
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
  if (isDemo && !hydrated && !inflight) {
    inflight = Promise.resolve().then(() => {
      state = loadDemoBoard(migrate);
      if (pendingRole) state = withSignedInRole(state, pendingRole);
      baseState = structuredClone(state);
      remoteReady = true;
      hydrated = true;
      emit();
    });
    return inflight;
  }
  if (hydrated) {
    if (role) actions.syncSignedInRole(role);
    return Promise.resolve();
  }
  if (!inflight) {
    inflight = (async () => {
      try {
        const res = await fetch("/api/workspace", { credentials: "include" });
        if (res.ok) {
          const data = (await res.json()) as { state: AppState; revision?: number };
          state = migrate(data.state);
          if (pendingRole) state = withSignedInRole(state, pendingRole);
          baseState = structuredClone(state);
          baseRevision = data.revision ?? 0;
          remoteReady = true;
        } else {
          remoteReady = false;
          toast.error("Couldn't load the workspace", {
            description: "Your changes stay on this page until the workspace loads.",
          });
        }
      } catch {
        remoteReady = false;
        toast.error("Couldn't load the workspace", {
          description: "Your changes stay on this page until the workspace loads.",
        });
      }
      hydrated = true;
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
  /** Project names in the file that already exist in this workspace. Throws when the file isn't a backup. */
  backupProjectConflicts(data: unknown): string[] {
    if (!isAdminUser(state)) throw new Error("Only admins can restore backups");
    const incoming = backupBoards(data);
    const have = new Set(state.projects.map((project) => projectKey(project.name)));
    const names: string[] = [];
    const seen = new Set<string>();
    for (const project of incoming.projects) {
      const key = projectKey(project.name);
      if (!key || !have.has(key) || seen.has(key)) continue;
      seen.add(key);
      names.push(project.name.trim());
    }
    return names;
  },
  /**
   * Adds projects and their tasks from a backup. People, labels, settings and the
   * subscription stay as they are. Matching project names are skipped unless override is set.
   */
  importBackup(data: unknown, override = false): { added: number; replaced: number } {
    if (!isAdminUser(state)) throw new Error("Only admins can restore backups");
    const incoming = backupBoards(data);
    const have = new Set(state.projects.map((project) => projectKey(project.name)));
    const chosen = new Map<string, Project>();
    for (const project of incoming.projects) {
      const key = projectKey(project.name);
      if (!key) continue;
      if (have.has(key) && !override) continue;
      chosen.set(key, project);
    }
    const replacing = new Set(
      [...chosen.keys()].filter((key) => have.has(key)),
    );
    const removedIds = new Set(
      state.projects.filter((project) => replacing.has(projectKey(project.name))).map((project) => project.id),
    );
    const idMap = new Map<string, string>();
    const projects = [
      ...state.projects.filter((project) => !removedIds.has(project.id)),
      ...[...chosen.values()].map((project) => {
        const id = uid("p");
        idMap.set(project.id, id);
        const memberIds = project.memberIds.filter((memberId) => state.users.some((user) => user.id === memberId));
        if (!memberIds.includes(state.currentUserId)) memberIds.push(state.currentUserId);
        return {
          ...project,
          id,
          memberIds,
          favorite: false,
          favoriteBy: [],
        };
      }),
    ];
    const sections = state.sections.filter((section) => !removedIds.has(section.projectId));
    for (const section of incoming.sections) {
      const projectId = idMap.get(section.projectId);
      if (!projectId) continue;
      const id = uid("s");
      idMap.set(section.id, id);
      sections.push({ ...section, id, projectId });
    }
    const knownUsers = new Set(state.users.map((user) => user.id));
    const knownLabels = new Set(state.labels.map((label) => label.id));
    const tasks = state.tasks.filter((task) => !removedIds.has(task.projectId));
    for (const task of incoming.tasks) {
      const projectId = idMap.get(task.projectId);
      const sectionId = idMap.get(task.sectionId);
      if (!projectId || !sectionId) continue;
      tasks.push({
        ...task,
        id: uid("t"),
        projectId,
        sectionId,
        assigneeIds: (task.assigneeIds ?? []).filter((id) => knownUsers.has(id)),
        labelIds: (task.labelIds ?? []).filter((id) => knownLabels.has(id)),
        checklist: (task.checklist ?? []).map((item) => ({ ...item, id: uid("c") })),
        comments: (task.comments ?? []).map((comment) => ({ ...comment, id: uid("m") })),
        files: (task.files ?? []).map((file) => ({ ...file, id: uid("f") })),
      });
    }
    set((current) => ({ ...current, projects, sections, tasks }));
    return { added: chosen.size - replacing.size, replaced: replacing.size };
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

function projectKey(name: string) {
  return name.trim().toLowerCase();
}

function backupBoards(data: unknown) {
  const clean = migrate(sanitizeBackup(data));
  return { projects: clean.projects, sections: clean.sections, tasks: clean.tasks };
}

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

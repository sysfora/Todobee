import { createSeed, CURRENT_USER_ID } from "./demo/seed.js";
import { seatChangeError } from "./demo/subscription.js";
import type { PlanId } from "./demo/subscription.js";
import type { AppState, Invite, User } from "./demo/types.js";

export interface Viewer {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  role: "admin" | "member";
}

export interface Billing {
  name: string;
  plan: PlanId;
  seats: number;
  renewsAt?: string | null;
}

export function initialWorkspaceState(user: { id: string; name: string; email: string; avatar?: string }): AppState {
  const adminUser: User = {
    id: user.id,
    name: user.name || "Admin",
    email: user.email,
    role: "Admin",
    avatar: user.avatar,
  };

  return {
    currentUserId: user.id,
    workspace: {
      name: user.name ? `${user.name.split(" ")[0]}'s Workspace` : "Todobee Workspace",
      plan: "premium",
      seats: 10,
    },
    notificationPrefs: {},
    users: [adminUser],
    invites: [],
    labels: [
      { id: "l-feature", name: "Feature", color: "violet" },
      { id: "l-bug", name: "Bug", color: "violet" },
      { id: "l-improvement", name: "Improvement", color: "sky" },
      { id: "l-design", name: "Design", color: "red" },
      { id: "l-marketing", name: "Marketing", color: "amber" },
      { id: "l-research", name: "Research", color: "green" },
      { id: "l-urgent", name: "Urgent", color: "pink" },
      { id: "l-nice", name: "Nice to have", color: "red" },
    ],
    projects: [],
    sections: [],
    tasks: [],
  };
}

export function present(state: AppState, viewer: Viewer, billing: Billing): AppState {
  let users = state.users.map((person) =>
    person.id === viewer.id
      ? {
          ...person,
          name: person.name || viewer.name,
          email: viewer.email,
          avatar: person.avatar || viewer.avatar || undefined,
          role: viewer.role === "admin" ? ("Admin" as const) : ("Member" as const),
        }
      : person,
  );
  if (!users.some((person) => person.id === viewer.id)) {
    users = [
      ...users,
      {
        id: viewer.id,
        name: viewer.name,
        email: viewer.email,
        role: viewer.role === "admin" ? "Admin" : "Member",
        avatar: viewer.avatar || undefined,
      },
    ];
  }
  return {
    ...state,
    currentUserId: viewer.id,
    users,
    invites: state.invites ?? [],
    workspace: {
      ...state.workspace,
      name: billing.name || state.workspace.name,
      plan: billing.plan,
      seats: billing.seats,
      renewsAt: billing.renewsAt || state.workspace.renewsAt,
    },
  };
}

function swapId(state: AppState, from: string, to: string): AppState {
  const map = (id: string) => (id === from ? to : id);
  const prefs: AppState["notificationPrefs"] = {};
  for (const [key, value] of Object.entries(state.notificationPrefs ?? {})) {
    prefs[map(key)] = value;
  }
  return {
    ...state,
    users: state.users.map((person) => (person.id === from ? { ...person, id: to } : person)),
    projects: state.projects.map((project) => ({
      ...project,
      memberIds: project.memberIds.map(map),
      favoriteBy: (project.favoriteBy ?? []).map(map),
    })),
    tasks: state.tasks.map((task) => ({
      ...task,
      assigneeIds: task.assigneeIds.map(map),
      comments: task.comments.map((comment) =>
        comment.userId === from ? { ...comment, userId: to } : comment,
      ),
      files: task.files.map((file) => (file.userId === from ? { ...file, userId: to } : file)),
    })),
    notificationPrefs: prefs,
  };
}

/** Attach a Google account to a directory user or a pending invite inside the Drive document. */
export function claimIdentity(
  state: AppState,
  user: { id: string; name: string; email: string; avatar?: string },
): { state: AppState; role: "admin" | "member" } | null {
  const email = user.email.toLowerCase();
  const existing = state.users.find((person) => person.email.toLowerCase() === email);
  if (existing) {
    const role = existing.role === "Admin" ? "admin" : "member";
    let next = existing.id === user.id ? state : swapId(state, existing.id, user.id);
    next = {
      ...next,
      users: next.users.map((person) =>
        person.id === user.id
          ? { ...person, name: user.name || person.name, email: user.email, avatar: user.avatar || person.avatar }
          : person,
      ),
    };
    return { state: next, role };
  }
  const now = Date.now();
  const invite = (state.invites ?? []).find(
    (item) => item.email.toLowerCase() === email && new Date(item.expiresAt).getTime() > now,
  );
  if (!invite) return null;
  const person: User = {
    id: user.id,
    name: user.name || invite.name,
    email: user.email,
    role: invite.role,
    avatar: user.avatar,
  };
  return {
    role: invite.role === "Admin" ? "admin" : "member",
    state: {
      ...state,
      users: [...state.users, person],
      invites: (state.invites ?? []).filter((item) => item.id !== invite.id),
    },
  };
}

export function mergeState(stored: AppState, incoming: AppState, viewer: Viewer, billing: Billing): AppState {
  const base: AppState = {
    ...stored,
    invites: stored.invites ?? [],
    workspace: {
      ...stored.workspace,
      name: billing.name || stored.workspace.name,
      plan: billing.plan,
      seats: billing.seats,
      renewsAt: billing.renewsAt || stored.workspace.renewsAt,
    },
  };
  if (viewer.role !== "admin") {
    const me = incoming.users.find((person) => person.id === viewer.id);
    const users = base.users.map((person) =>
      person.id === viewer.id && me ? { ...person, name: me.name, avatar: me.avatar } : person,
    );
    const allowed = new Set(
      base.projects.filter((project) => project.memberIds.includes(viewer.id)).map((project) => project.id),
    );
    return {
      ...base,
      users,
      projects: base.projects.map((project) => {
        const next = incoming.projects.find((item) => item.id === project.id);
        if (!next || !allowed.has(project.id)) return project;
        return { ...project, favoriteBy: next.favoriteBy ?? project.favoriteBy };
      }),
      sections: [
        ...base.sections.filter((section) => !allowed.has(section.projectId)),
        ...incoming.sections.filter((section) => allowed.has(section.projectId)),
      ],
      tasks: [
        ...base.tasks.filter((task) => !allowed.has(task.projectId)),
        ...incoming.tasks.filter((task) => allowed.has(task.projectId)),
      ],
      notificationPrefs: {
        ...base.notificationPrefs,
        [viewer.id]: incoming.notificationPrefs?.[viewer.id] ?? base.notificationPrefs?.[viewer.id],
      },
    };
  }

  const name = incoming.workspace?.name?.trim() || base.workspace.name;
  return {
    ...incoming,
    currentUserId: stored.currentUserId || viewer.id,
    invites: incoming.invites ?? [],
    workspace: {
      ...incoming.workspace,
      name,
      plan: billing.plan,
      seats: billing.seats,
      renewsAt: billing.renewsAt || incoming.workspace?.renewsAt || base.workspace.renewsAt,
    },
  };
}

export function seatProblem(state: AppState, seats: number, plan: PlanId) {
  const pending = (state.invites ?? []).filter((invite: Invite) => new Date(invite.expiresAt) > new Date());
  return seatChangeError(seats, state.users.length + pending.length, plan);
}

export function fileIds(state: AppState) {
  const ids = new Set<string>();
  for (const task of state.tasks ?? []) {
    for (const file of task.files ?? []) {
      const match = file.driveUrl?.match(/\/api\/files\/([^/?#]+)/);
      if (match?.[1]) ids.add(decodeURIComponent(match[1]));
    }
  }
  return ids;
}

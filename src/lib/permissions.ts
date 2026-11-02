import type { AppState, Project, User } from "./types";

export const isAdminUser = (s: AppState) =>
  s.users.find((u) => u.id === s.currentUserId)?.role === "Admin";

export type AccountRole = "admin" | "member";

/** The signed-in person's role comes from their account, never from data saved in the browser. */
export function withSignedInRole(s: AppState, role: AccountRole): AppState {
  const want: User["role"] = role === "admin" ? "Admin" : "Member";
  const me = s.users.find((u) => u.id === s.currentUserId);
  if (!me || me.role === want) return s;
  return { ...s, users: s.users.map((u) => (u.id === me.id ? { ...u, role: want } : u)) };
}

/** Only admins can open Home (the dashboard) and Users; everyone else starts on Projects. */
export const homePathFor = (role: AccountRole) => (role === "admin" ? "/dashboard" : "/projects");

/** Admins can work in every project; members only in projects they were added to. */
export const canWorkInProject = (s: AppState, projectId: string) =>
  isAdminUser(s) ||
  !!s.projects.find((p) => p.id === projectId)?.memberIds.includes(s.currentUserId);

/** The workspace must always keep at least one admin. */
export function wouldRemoveLastAdmin(users: User[], id: string, nextRole?: User["role"]) {
  const admins = users.filter((u) => u.role === "Admin");
  const target = users.find((u) => u.id === id);
  if (target?.role !== "Admin" || admins.length > 1) return false;
  return nextRole === undefined || nextRole !== "Admin";
}

const safeData = (v: unknown) =>
  typeof v === "string" && /^data:[\w.+-]+\/[\w.+-]+;base64,[A-Za-z0-9+/=]+$/.test(v)
    ? v
    : undefined;
const safeImage = (v: unknown) => {
  const d = safeData(v);
  return d && d.startsWith("data:image/") ? d : undefined;
};
const safeHttps = (v: unknown) => {
  if (typeof v !== "string") return undefined;
  try {
    return new URL(v).protocol === "https:" ? v : undefined;
  } catch {
    return undefined;
  }
};
const str = (v: unknown, max = 5000) => (typeof v === "string" ? v.slice(0, max) : "");
const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/** Validate a restored backup and strip anything that could carry harmful links. */
export function sanitizeBackup(raw: unknown): AppState {
  if (!raw || typeof raw !== "object") throw new Error("Not a backup");
  const d = raw as Partial<Record<"users" | "projects" | "labels" | "sections" | "tasks", unknown>>;
  if (!Array.isArray(d.users) || !Array.isArray(d.projects)) throw new Error("Not a backup");
  const users = arr<User>(d.users)
    .filter((u) => u && typeof u.id === "string")
    .map((u) => ({
      id: u.id,
      name: str(u.name, 200),
      email: str(u.email, 320),
      role: u.role === "Admin" ? ("Admin" as const) : ("Member" as const),
      avatar: safeImage(u.avatar),
    }));
  if (!users.some((u) => u.role === "Admin")) throw new Error("Backup has no admin");
  const s = d as unknown as AppState;
  return {
    ...s,
    currentUserId: users.some((u) => u.id === s.currentUserId) ? s.currentUserId : users[0]!.id,
    users,
    projects: arr<Project>(d.projects).map((p) => ({
      ...p,
      name: str(p.name, 200),
      memberIds: arr<string>(p.memberIds).filter((x) => typeof x === "string"),
    })),
    labels: arr(d.labels),
    sections: arr(d.sections),
    tasks: arr<AppState["tasks"][number]>(d.tasks).map((t) => ({
      ...t,
      title: str(t.title, 500),
      description: str(t.description),
      files: arr<AppState["tasks"][number]["files"][number]>(t.files).map((f) => ({
        ...f,
        name: str(f.name, 255),
        driveUrl: safeHttps(f.driveUrl),
        dataUrl: safeData(f.dataUrl),
      })),
    })),
  };
}

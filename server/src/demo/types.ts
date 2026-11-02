import type { Swatch } from "./colors";
import type { PlanId } from "./subscription";

export type Role = "Admin" | "Member";
export type Priority = "high" | "medium" | "low" | "none";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string | undefined;
}

/** A pending invitation; it holds a seat until accepted, revoked or 30 days pass. */
export interface Invite {
  id: string;
  name: string;
  email: string;
  role: Role;
  invitedAt: string;
  expiresAt: string;
}

export interface Label {
  id: string;
  name: string;
  color: Swatch;
}

export interface Project {
  id: string;
  name: string;
  color: Swatch;
  /** Derived for the signed-in user from favoriteBy. */
  favorite: boolean;
  /** Users who starred this project. */
  favoriteBy?: string[] | undefined;
  memberIds: string[];
  createdAt: string;
}

export interface Section {
  id: string;
  projectId: string;
  name: string;
  order: number;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Comment {
  id: string;
  userId: string;
  text: string;
  createdAt: string;
}

export interface TaskFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  userId: string;
  createdAt: string;
  /** Link to the file once stored in the admin's Google Drive. */
  driveUrl?: string | undefined;
  /** Small files kept locally until Drive storage is connected. */
  dataUrl?: string | undefined;
}

export interface Task {
  id: string;
  projectId: string;
  sectionId: string;
  title: string;
  description: string;
  completed: boolean;
  completedAt?: string | undefined;
  priority: Priority;
  /** Local calendar date, YYYY-MM-DD */
  dueDate?: string | undefined;
  assigneeIds: string[];
  labelIds: string[];
  checklist: ChecklistItem[];
  /** Shown to users as "Notes". */
  comments: Comment[];
  files: TaskFile[];
  order: number;
  createdAt: string;
}

export interface NotificationPrefs {
  dueToday: boolean;
  overdue: boolean;
  assigned: boolean;
  email: boolean;
}

export interface Workspace {
  name: string;
  plan: PlanId;
  seats: number;
  /** When the yearly subscription next renews (ISO date). */
  renewsAt?: string | undefined;
}

export interface AppState {
  currentUserId: string;
  workspace: Workspace;
  /** Per user id */
  notificationPrefs: Record<string, NotificationPrefs>;
  users: User[];
  invites?: Invite[] | undefined;
  labels: Label[];
  projects: Project[];
  sections: Section[];
  tasks: Task[];
}

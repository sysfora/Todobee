import type { AppState, Priority, Task } from "./types";
import { addDays, toISODate } from "./dates";

export type DueGroup = "today" | "overdue" | "upcoming" | "none";

export function dueGroup(task: Pick<Task, "dueDate">, today: string): DueGroup {
  if (!task.dueDate) return "none";
  if (task.dueDate === today) return "today";
  return task.dueDate < today ? "overdue" : "upcoming";
}

/** Open tasks assigned to the user, grouped by due date. */
export function groupMyTasks(tasks: Task[], userId: string, today: string) {
  const groups: Record<DueGroup, Task[]> = { today: [], overdue: [], upcoming: [], none: [] };
  for (const t of tasks) {
    if (t.completed || !t.assigneeIds.includes(userId)) continue;
    groups[dueGroup(t, today)].push(t);
  }
  const byDue = (a: Task, b: Task) => (a.dueDate ?? "").localeCompare(b.dueDate ?? "");
  groups.overdue.sort(byDue);
  groups.upcoming.sort(byDue);
  return groups;
}

/**
 * One choice per filter ("all" = no filter). There's no match-type option: a task
 * shows when it fits every filter that isn't set to "all".
 */
export interface TaskFilter {
  /** Text that must appear in the task title; empty = no keyword */
  keyword: string;
  /** "me" = current user, "none" = unassigned, otherwise a user id */
  assignee: string;
  /** A priority; "none" = no priority */
  priority: "all" | Priority;
  /** A label id; "none" = no labels */
  label: string;
  due: "all" | DueGroup;
}

export const emptyFilter: TaskFilter = {
  keyword: "",
  assignee: "all",
  priority: "all",
  label: "all",
  due: "all",
};

export function isFilterActive(f: TaskFilter) {
  return (
    f.keyword.trim() !== "" ||
    f.assignee !== "all" ||
    f.priority !== "all" ||
    f.label !== "all" ||
    f.due !== "all"
  );
}

export function matchesFilter(
  task: Task,
  f: TaskFilter,
  currentUserId: string,
  today: string,
): boolean {
  const kw = f.keyword.trim().toLowerCase();
  if (kw && !task.title.toLowerCase().includes(kw)) return false;
  if (f.assignee !== "all") {
    const ok =
      f.assignee === "none"
        ? task.assigneeIds.length === 0
        : task.assigneeIds.includes(f.assignee === "me" ? currentUserId : f.assignee);
    if (!ok) return false;
  }
  if (f.priority !== "all" && task.priority !== f.priority) return false;
  if (f.label !== "all") {
    const ok = f.label === "none" ? task.labelIds.length === 0 : task.labelIds.includes(f.label);
    if (!ok) return false;
  }
  if (f.due !== "all" && dueGroup(task, today) !== f.due) return false;
  return true;
}

/** Dashboard scope: "all", or one user's assigned tasks and the projects they belong to. */
export function scopeToUser<S extends Pick<AppState, "tasks" | "projects">>(
  state: S,
  userId: string,
): S {
  if (userId === "all") return state;
  return {
    ...state,
    tasks: state.tasks.filter((t) => t.assigneeIds.includes(userId)),
    projects: state.projects.filter((p) => p.memberIds.includes(userId)),
  };
}

export function dashboardStats(state: Pick<AppState, "tasks" | "projects">) {
  const completed = state.tasks.filter((t) => t.completed).length;
  return {
    open: state.tasks.length - completed,
    completed,
    projects: state.projects.length,
  };
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Completed counts for the 7 days ending today (oldest first). */
export function completedLast7Days(tasks: Task[], today: Date) {
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(today, i - 6);
    const iso = toISODate(day);
    const count = tasks.filter(
      (t) => t.completed && t.completedAt && toISODate(new Date(t.completedAt)) === iso,
    ).length;
    return { label: DAY_NAMES[day.getDay()] ?? "", count };
  });
}

/** Completed counts per month of the given year. */
export function completedByMonth(tasks: Task[], year: number) {
  return MONTH_NAMES.map((label, m) => ({
    label,
    count: tasks.filter((t) => {
      if (!t.completed || !t.completedAt) return false;
      const d = new Date(t.completedAt);
      return d.getFullYear() === year && d.getMonth() === m;
    }).length,
  }));
}

export type GroupBy = "sections" | "assigned" | "labels" | "priority" | "due";
export type TaskGroup = { id: string; name: string; tasks: Task[] };

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

/** Board columns for a non-section grouping; tasks with several assignees/labels appear in each. */
export function groupTasks(
  tasks: Task[],
  by: Exclude<GroupBy, "sections">,
  ctx: {
    users: { id: string; name: string }[];
    labels: { id: string; name: string }[];
    today: string;
    /** The signed-in user's column comes first, like "Assigned to me" in Filters. */
    meId?: string;
  },
): TaskGroup[] {
  const pick = (groups: { id: string; name: string; match: (t: Task) => boolean }[]) =>
    groups.map((g) => ({ id: g.id, name: g.name, tasks: tasks.filter(g.match) }));
  // Same order as the Filters dropdowns.
  if (by === "assigned") {
    const col = (u: { id: string; name: string }) => ({
      id: u.id,
      name: u.name,
      match: (t: Task) => t.assigneeIds.includes(u.id),
    });
    const me = ctx.users.find((u) => u.id === ctx.meId);
    return pick([
      ...(me ? [col(me)] : []),
      { id: "none", name: "Unassigned", match: (t) => t.assigneeIds.length === 0 },
      ...ctx.users
        .filter((u) => u.id !== me?.id)
        .sort(byName)
        .map(col),
    ]);
  }
  if (by === "labels")
    return pick([
      { id: "none", name: "No Labels", match: (t) => t.labelIds.length === 0 },
      ...[...ctx.labels]
        .sort(byName)
        .map((l) => ({ id: l.id, name: l.name, match: (t: Task) => t.labelIds.includes(l.id) })),
    ]);
  if (by === "priority")
    return pick(
      (
        [
          ["high", "High"],
          ["medium", "Medium"],
          ["low", "Low"],
          ["none", "No Priority"],
        ] as const
      ).map(([id, name]) => ({ id, name, match: (t: Task) => t.priority === id })),
    );
  return pick(
    (
      [
        ["today", "Today"],
        ["upcoming", "Upcoming"],
        ["overdue", "Overdue"],
        ["none", "No Due Date"],
      ] as const
    ).map(([id, name]) => ({ id, name, match: (t: Task) => dueGroup(t, ctx.today) === id })),
  );
}

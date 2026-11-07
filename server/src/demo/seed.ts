import type { AppState, Priority, Project, Section, Task, User, Label } from "./types";
import type { Swatch } from "./colors";
import { addDays, toISODate } from "./dates";

const portrait = (g: "men" | "women", n: number) =>
  `https://randomuser.me/api/portraits/${g}/${n}.jpg`;

export const CURRENT_USER_ID = "u-admin";

const users: User[] = [
  {
    id: "u-admin",
    name: "Lilly McCarthy",
    email: "lilly@example.com",
    role: "Admin",
    avatar: portrait("women", 44),
  },
  {
    id: "u-james",
    name: "James Carter",
    email: "james@example.com",
    role: "Member",
    avatar: portrait("men", 32),
  },
  {
    id: "u-grace",
    name: "Grace Wilson",
    email: "grace@example.com",
    role: "Member",
    avatar: portrait("women", 68),
  },
  {
    id: "u-franklin",
    name: "Franklin Harrison",
    email: "franklin@example.com",
    role: "Member",
    avatar: portrait("men", 75),
  },
  {
    id: "u-amelia",
    name: "Amelia Taylor",
    email: "amelia@example.com",
    role: "Member",
    avatar: portrait("women", 12),
  },
  {
    id: "u-david",
    name: "David Kim",
    email: "david@example.com",
    role: "Member",
    avatar: portrait("men", 46),
  },
  {
    id: "u-robert",
    name: "Robert Wilson",
    email: "robert@example.com",
    role: "Member",
    avatar: portrait("men", 22),
  },
  {
    id: "u-sarah",
    name: "Sarah Thompson",
    email: "sarah@example.com",
    role: "Member",
    avatar: portrait("women", 29),
  },
  {
    id: "u-jessica",
    name: "Jessica Lee",
    email: "jessica@example.com",
    role: "Member",
    avatar: portrait("women", 90),
  },
];

const labels: Label[] = [
  { id: "l-feature", name: "Feature", color: "violet" },
  { id: "l-bug", name: "Bug", color: "violet" },
  { id: "l-improvement", name: "Improvement", color: "sky" },
  { id: "l-design", name: "Design", color: "red" },
  { id: "l-marketing", name: "Marketing", color: "amber" },
  { id: "l-research", name: "Research", color: "green" },
  { id: "l-urgent", name: "Urgent", color: "pink" },
  { id: "l-nice", name: "Nice to have", color: "red" },
];

export function createSeed(now: Date = new Date()): AppState {
  const d = (n: number) => toISODate(addDays(now, n));
  const at = (n: number, hour = 11) => {
    const x = addDays(now, n);
    x.setHours(hour, 0, 0, 0);
    return x.toISOString();
  };
  /** A timestamp in an earlier month of the current year (falls back to recent days early in the year). */
  const monthAgo = (months: number, day = 12) => {
    const x = new Date(now.getFullYear(), now.getMonth() - months, day, 10);
    return x.getFullYear() === now.getFullYear() ? x.toISOString() : at(-2 - months);
  };

  const projects: Project[] = [];
  const sections: Section[] = [];
  const tasks: Task[] = [];

  const addProject = (
    id: string,
    name: string,
    color: Swatch,
    favorite: boolean,
    memberIds: string[],
    sectionNames = ["Todo", "Review", "Done"],
  ) => {
    projects.push({
      id,
      name,
      color,
      favorite,
      favoriteBy: favorite ? [CURRENT_USER_ID] : [],
      memberIds,
      createdAt: at(-60),
    });
    sectionNames.forEach((s, i) =>
      sections.push({ id: `${id}-s${i}`, projectId: id, name: s, order: i }),
    );
  };

  let order = 0;
  const addTask = (
    projectId: string,
    sectionIndex: number,
    title: string,
    opts: {
      done?: string;
      due?: string;
      priority?: Priority;
      assignees?: string[];
      labels?: string[];
      checklist?: [number, number];
      comments?: { userId: string; text: string }[];
      description?: string;
    } = {},
  ) => {
    const id = `t-${tasks.length + 1}`;
    const [doneCount, total] = opts.checklist ?? [0, 0];
    tasks.push({
      id,
      projectId,
      sectionId: `${projectId}-s${sectionIndex}`,
      title,
      description: opts.description ?? "",
      completed: !!opts.done,
      completedAt: opts.done,
      priority: opts.priority ?? "none",
      dueDate: opts.due,
      assigneeIds: opts.assignees ?? [],
      labelIds: opts.labels ?? [],
      checklist: Array.from({ length: total }, (_, i) => ({
        id: `${id}-c${i}`,
        text: `Step ${i + 1}`,
        done: i < doneCount,
      })),
      comments: (opts.comments ?? []).map((c, i) => ({
        id: `${id}-m${i}`,
        userId: c.userId,
        text: c.text,
        createdAt: at(-1 - i, 14),
      })),
      files: [],
      order: order++,
      createdAt: at(-20),
    });
  };

  // Marketing Campaign
  addProject(
    "prj-marketing",
    "Marketing Campaign",
    "red",
    true,
    ["u-admin", "u-james", "u-franklin"],
    ["Todo", "Review", "Done", "Ideas"],
  );
  addTask("prj-marketing", 0, "Design hero section", {
    assignees: ["u-james"],
    labels: ["l-design"],
  });
  addTask("prj-marketing", 0, "Write launch announcement", {
    due: d(0),
    priority: "medium",
    assignees: ["u-admin"],
    labels: ["l-marketing"],
    checklist: [1, 3],
    description: "Short announcement for the blog, newsletter and social channels.",
  });
  addTask("prj-marketing", 0, "Improve error handling on forms", {
    done: at(0, 9),
    assignees: ["u-admin"],
  });
  addTask("prj-marketing", 0, "Prepare social media assets", {
    due: d(12),
    assignees: ["u-franklin"],
    labels: ["l-design"],
  });
  addTask("prj-marketing", 0, "Collect partner logos", { assignees: ["u-admin", "u-james"] });

  addTask("prj-marketing", 1, "Review ad copy variations", {
    assignees: ["u-james"],
    labels: ["l-bug"],
  });
  addTask("prj-marketing", 1, "Approve campaign budget", {
    due: d(-3),
    priority: "high",
    assignees: ["u-admin", "u-james"],
    labels: ["l-feature"],
    checklist: [3, 3],
  });
  addTask("prj-marketing", 1, "Review engagement report", {
    done: at(-1),
    due: d(-10),
    assignees: ["u-franklin"],
    checklist: [4, 4],
  });
  addTask("prj-marketing", 1, "Optimize homepage images", {
    done: at(-1, 15),
    due: d(-14),
    assignees: ["u-james"],
    labels: ["l-feature", "l-nice"],
  });
  addTask("prj-marketing", 1, "Draft email campaign copy", {
    done: at(-2),
    due: d(-8),
    assignees: ["u-james", "u-admin"],
    labels: ["l-research"],
    checklist: [0, 1],
  });
  addTask("prj-marketing", 1, "Set up UTM tracking", {
    due: d(30),
    assignees: ["u-admin"],
    labels: ["l-improvement"],
  });

  addTask("prj-marketing", 2, "Create mobile navigation", {
    done: at(-3),
    due: d(-5),
    assignees: ["u-franklin"],
    comments: [{ userId: "u-james", text: "Looks great on iOS and Android." }],
  });
  addTask("prj-marketing", 2, "Fix login validation", {
    done: at(-4),
    due: d(-9),
    priority: "high",
    assignees: ["u-admin"],
    labels: ["l-bug", "l-research"],
    comments: [{ userId: "u-franklin", text: "Verified on staging." }],
  });
  addTask("prj-marketing", 2, "Clean up database indexes", {
    done: at(-5),
    due: d(-4),
    assignees: ["u-admin"],
    comments: [
      { userId: "u-james", text: "Query times dropped by half." },
      { userId: "u-admin", text: "Nice work!" },
    ],
  });
  addTask("prj-marketing", 2, "Write landing page headline options", {
    done: monthAgo(1),
    due: d(-30),
    assignees: ["u-james"],
  });
  addTask("prj-marketing", 2, "Plan weekly content calendar", {
    done: monthAgo(1, 20),
    due: d(-33),
    assignees: ["u-franklin"],
    checklist: [4, 4],
  });
  addTask("prj-marketing", 3, "Partner webinar series", { checklist: [0, 1] });

  // Content Calendar
  addProject("prj-content", "Content Calendar", "orange", true, ["u-admin", "u-grace", "u-amelia"]);
  addTask("prj-content", 0, "Outline November newsletter", {
    due: d(4),
    assignees: ["u-grace"],
    labels: ["l-marketing"],
  });
  addTask("prj-content", 0, "Interview customer for case study", {
    due: d(9),
    assignees: ["u-admin", "u-amelia"],
    priority: "low",
  });
  addTask("prj-content", 1, "Edit product tutorial video", {
    assignees: ["u-amelia"],
    checklist: [2, 5],
  });
  addTask("prj-content", 2, "Publish holiday gift guide", {
    done: monthAgo(2),
    assignees: ["u-grace"],
  });
  addTask("prj-content", 2, "Refresh evergreen blog posts", {
    done: monthAgo(2, 22),
    assignees: ["u-amelia"],
  });

  // Customer Feedback Inbox
  addProject("prj-feedback", "Customer Feedback Inbox", "rose", false, ["u-admin", "u-david"]);
  addTask("prj-feedback", 0, "Tag last week's survey responses", {
    assignees: ["u-david"],
    labels: ["l-research"],
  });
  addTask("prj-feedback", 0, "Reply to enterprise feature requests", {
    due: d(-1),
    priority: "high",
    assignees: ["u-admin"],
    labels: ["l-urgent"],
  });
  addTask("prj-feedback", 2, "Summarize Q3 feedback themes", {
    done: monthAgo(3),
    assignees: ["u-david"],
  });

  // Website Builder
  addProject("prj-website", "Website Builder", "indigo", true, ["u-admin", "u-james", "u-sarah"]);
  addTask("prj-website", 0, "Drag-and-drop page sections", {
    priority: "high",
    assignees: ["u-sarah"],
    labels: ["l-feature"],
    checklist: [1, 4],
  });
  addTask("prj-website", 0, "Custom domain settings screen", {
    due: d(18),
    assignees: ["u-james"],
    labels: ["l-design"],
  });
  addTask("prj-website", 1, "Template gallery filters", {
    assignees: ["u-sarah"],
    labels: ["l-improvement"],
  });
  addTask("prj-website", 2, "Autosave drafts", { done: monthAgo(3, 18), assignees: ["u-james"] });
  addTask("prj-website", 2, "Image upload compression", {
    done: monthAgo(4),
    assignees: ["u-sarah"],
  });

  // Android Development
  addProject("prj-android", "Android Development", "lime", false, ["u-admin", "u-robert"]);
  addTask("prj-android", 0, "Offline mode for task lists", {
    assignees: ["u-robert"],
    labels: ["l-feature"],
  });
  addTask("prj-android", 1, "Push notification settings", {
    due: d(6),
    assignees: ["u-robert", "u-admin"],
  });
  addTask("prj-android", 2, "Fix crash on rotation", {
    done: monthAgo(4, 25),
    assignees: ["u-robert"],
    labels: ["l-bug"],
  });

  // SEO Optimization
  addProject("prj-seo", "SEO Optimization", "pink", false, ["u-admin", "u-jessica", "u-grace"]);
  addTask("prj-seo", 0, "Audit meta descriptions", { assignees: ["u-jessica"] });
  addTask("prj-seo", 0, "Fix broken internal links", { assignees: ["u-grace"], priority: "medium" });
  addTask("prj-seo", 2, "Submit updated sitemap", { done: monthAgo(5), assignees: ["u-jessica"] });

  // Payment Integration
  addProject("prj-payments", "Payment Integration", "teal", false, [
    "u-admin",
    "u-david",
    "u-franklin",
  ]);
  addTask("prj-payments", 0, "Add invoice PDF export", {
    assignees: ["u-david"],
    labels: ["l-feature"],
  });
  addTask("prj-payments", 1, "Test refund webhooks", {
    assignees: ["u-franklin"],
    checklist: [2, 3],
  });
  addTask("prj-payments", 2, "Currency formatting", {
    done: monthAgo(5, 20),
    assignees: ["u-david"],
  });

  // Application UI
  addProject("prj-appui", "Application UI", "green", false, ["u-admin", "u-amelia"]);
  addTask("prj-appui", 0, "Empty state illustrations", {
    assignees: ["u-amelia"],
    labels: ["l-design", "l-nice"],
  });
  addTask("prj-appui", 2, "Keyboard shortcuts panel", { done: monthAgo(6), assignees: ["u-amelia"] });

  return {
    currentUserId: CURRENT_USER_ID,
    workspace: {
      name: "Todobee Workspace",
      plan: "premium" as const,
      seats: 10,
      // Sample renewal date until real billing is connected
      renewsAt: addDays(new Date(), 150).toISOString(),
    },
    notificationPrefs: {},
    users,
    labels,
    projects,
    sections,
    tasks,
  };
}

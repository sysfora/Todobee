import type { ReactNode } from "react";
import {
  CalendarDays,
  Check,
  CircleCheck,
  FileText,
  Flag,
  FolderClosed,
  HardDrive,
  Inbox,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ink, labelVar, tint } from "@/lib/colors";
import { LabelChip, UserAvatar } from "@/components/app/primitives";
import { DEMO_LABELS as L, DEMO_USERS as U } from "./mock-data";
import { MockTaskCard } from "./MockTaskCard";

/** Soft round blob behind each illustration, like the reference site. */
function Stage({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="img" aria-label={label} className="relative mx-auto w-full max-w-md py-6">
      <div className="absolute inset-x-4 inset-y-0 rounded-[45%] bg-hero-blob" />
      <div className="relative flow-root">{children}</div>
    </div>
  );
}

const panel = "rounded-2xl bg-card shadow-panel";

export function BoardVisual() {
  const cols = [
    { name: "Assigned: Maya", cards: ["Homepage copy", "Pricing table"] },
    { name: "Assigned: Arun", cards: ["Launch checklist"] },
  ];
  return (
    <Stage label="Board grouped by assignee, with a Group By menu open">
      <div className={cn(panel, "mr-10 mb-24 p-3 sm:mr-12")}>
        <div className="mb-3 flex items-center justify-between px-1">
          <p className="font-semibold text-foreground">Content Calendar</p>
          <span className="rounded-full bg-primary-container px-3 py-1 text-xs font-medium text-on-primary-container">
            Group By: Assigned
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {cols.map((c) => (
            <div key={c.name} className="rounded-xl bg-column p-2">
              <p className="px-1 pb-2 text-xs font-semibold text-foreground">{c.name}</p>
              <div className="space-y-2">
                {c.cards.map((t, i) => (
                  <MockTaskCard
                    key={t}
                    title={t}
                    labels={i === 0 ? [L.marketing] : []}
                    people={[c.name.endsWith("Maya") ? U.maya : U.arun]}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className={cn(panel, "absolute right-0 bottom-0 w-40 py-2 text-sm")}>
        {["Sections", "Assigned", "Labels", "Priority", "Due Date"].map((o) => (
          <p
            key={o}
            className={cn(
              "flex items-center justify-between px-4 py-1.5 text-foreground",
              o === "Assigned" && "bg-muted font-medium",
            )}
          >
            {o}
            {o === "Assigned" && <Check className="h-3.5 w-3.5" />}
          </p>
        ))}
      </div>
    </Stage>
  );
}

export function TaskVisual() {
  const items = [
    { text: "Write the brief", done: true },
    { text: "Share with design", done: true },
    { text: "Final review", done: false },
  ];
  return (
    <Stage label="Task details with checklist, notes, files, priority and labels">
      <div className={cn(panel, "p-5")}>
        <p className="text-lg font-semibold text-foreground">Launch announcement</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium"
            style={{
              backgroundColor: tint("var(--priority-high)"),
              color: ink("var(--priority-high)"),
            }}
          >
            <Flag className="h-3.5 w-3.5 fill-priority-high text-priority-high" /> High
          </span>
          <LabelChip label={L.marketing} />
          <LabelChip label={L.urgent} />
        </div>
        <p className="mt-4 text-sm font-semibold text-foreground">
          Checklist <span className="font-normal text-muted-foreground">2/3</span>
        </p>
        <ul className="mt-1.5 space-y-1.5">
          {items.map((i) => (
            <li key={i.text} className="flex items-center gap-2.5 text-sm">
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-[4px] border",
                  i.done ? "border-primary bg-primary text-primary-foreground" : "border-input",
                )}
              >
                {i.done && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
              <span className={i.done ? "text-muted-foreground line-through" : "text-foreground"}>
                {i.text}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm font-semibold text-foreground">Notes</p>
        <div className="mt-1.5 flex gap-2.5">
          <UserAvatar user={U.nina} decorative className="h-7 w-7 ring-0" />
          <p className="rounded-xl bg-muted px-3 py-2 text-sm text-foreground">
            Draft looks great, ready for Friday.
          </p>
        </div>
        <div className="mt-4 flex items-center gap-2.5 rounded-xl border px-3 py-2 text-sm">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1 truncate text-foreground">press-kit.pdf</span>
          <span className="text-xs text-muted-foreground">1.2 MB</span>
        </div>
      </div>
    </Stage>
  );
}

export function DriveVisual() {
  const items = [
    { icon: CircleCheck, label: "Tasks & checklists", color: "var(--swatch-blue)" },
    { icon: FileText, label: "Notes", color: "var(--swatch-green)" },
    { icon: FolderClosed, label: "Attached files", color: "var(--swatch-orange)" },
  ];
  return (
    <Stage label="Todobee saving tasks, notes and files to the admin's Google Drive, with daily backups ready to restore">
      <div className="mb-16 flex items-stretch gap-3">
        <div className={cn(panel, "flex-1 p-4")}>
          <p className="text-xs font-semibold text-muted-foreground">Todobee</p>
          <p className="mt-0.5 font-semibold text-foreground">Your workspace</p>
          <ul className="mt-3 space-y-2">
            {items.map(({ icon: Icon, label, color }) => (
              <li key={label} className="flex items-center gap-2 text-xs text-foreground">
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-lg"
                  style={{ backgroundColor: tint(color), color: ink(color) }}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.8} />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col items-center justify-center gap-1 text-primary">
          <span className="h-px w-8 bg-primary" />
          <Check className="h-4 w-4" />
          <span className="h-px w-8 bg-primary" />
        </div>
        <div
          className={cn(panel, "flex flex-1 flex-col items-center justify-center p-4 text-center")}
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container">
            <HardDrive className="h-7 w-7" strokeWidth={1.6} />
          </span>
          <p className="mt-3 font-semibold text-foreground">Google Drive</p>
          <p className="text-xs text-muted-foreground">Admin's own account</p>
          <span className="mt-3 rounded-full bg-primary-container px-3 py-1 text-[0.7rem] font-medium text-on-primary-container">
            Synced just now
          </span>
        </div>
      </div>
      <div className={cn(panel, "absolute inset-x-6 bottom-0 flex items-center gap-3 px-4 py-3")}>
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{
            backgroundColor: tint("var(--swatch-green)"),
            color: ink("var(--swatch-green)"),
          }}
        >
          <ShieldCheck className="h-5 w-5" strokeWidth={1.7} />
        </span>
        <div className="min-w-0 flex-1 text-xs">
          <p className="font-medium text-foreground">Backup ready</p>
          <p className="text-muted-foreground">Restore your workspace anytime</p>
        </div>
        <span className="rounded-full border px-3 py-1 text-xs font-medium text-primary">
          Restore
        </span>
      </div>
    </Stage>
  );
}

export function MyTasksVisual() {
  const stats = [
    { icon: Inbox, label: "Open", value: 23, color: "var(--swatch-blue)" },
    { icon: CircleCheck, label: "Done", value: 18, color: "var(--swatch-green)" },
    { icon: CalendarDays, label: "Projects", value: 8, color: "var(--swatch-violet)" },
  ];
  const groups = [
    { name: "Today", task: "Write launch announcement", due: "Today" },
    { name: "Overdue", task: "Approve campaign budget", due: "Oct 23", overdue: true },
    { name: "Upcoming", task: "Push notification settings", due: "Nov 1" },
  ];
  return (
    <Stage label="My Tasks grouped into today, overdue and upcoming, with dashboard totals">
      <div className="grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <div key={s.label} className={cn(panel, "flex items-center gap-2 p-2.5")}>
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: tint(s.color), color: ink(s.color) }}
            >
              <s.icon className="h-4 w-4" strokeWidth={1.7} />
            </span>
            <div>
              <p className="text-[0.7rem] leading-tight text-muted-foreground">{s.label}</p>
              <p className="text-lg leading-tight font-semibold text-foreground">{s.value}</p>
            </div>
          </div>
        ))}
      </div>
      <div className={cn(panel, "mt-3 divide-y overflow-hidden")}>
        {groups.map((g) => (
          <div key={g.name} className="px-4 py-3">
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              {g.name}
            </p>
            <div className="mt-1.5 flex items-center gap-3">
              <span className="h-4 w-4 shrink-0 rounded-full border-[1.5px] border-subtle" />
              <span className="flex-1 truncate text-sm text-foreground">{g.task}</span>
              <span className={cn("text-xs", g.overdue ? "text-danger" : "text-link")}>
                {g.due}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Stage>
  );
}

export function AccessVisual() {
  const members = [
    {
      name: "Lilly McCarthy",
      email: "lilly@company.com",
      initials: "LM",
      color: "teal",
      role: "Admin",
    },
    { name: "Maya Khan", email: "maya@company.com", initials: "MK", color: "pink", role: "User" },
    { name: "Arun Shah", email: "arun@company.com", initials: "AS", color: "amber", role: "User" },
  ] as const;
  const projects = [
    { name: "Marketing Campaign", hidden: false },
    { name: "Product Launch", hidden: false },
    { name: "Finance", hidden: true },
  ];
  return (
    <Stage label="Inviting a teammate by email, a member list showing who is an Admin and who is a User, and the projects one member can see">
      <div className={cn(panel, "mr-8 mb-24 p-5 sm:mr-10")}>
        <p className="font-semibold text-foreground">Team project</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Invite people by email</p>
        <div className="mt-3 flex items-center gap-2 rounded-full bg-muted px-3 py-2">
          <Mail className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.8} />
          <span className="flex-1 truncate text-sm text-foreground">teammate@company.com</span>
          <span className="shrink-0 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
            Invite
          </span>
        </div>
        <ul className="mt-4 space-y-3">
          {members.map((m) => (
            <li key={m.name} className="flex items-center gap-3">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-on-swatch"
                style={{ backgroundColor: labelVar(m.color) }}
              >
                {m.initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{m.name}</p>
                <p className="truncate text-xs text-muted-foreground">{m.email}</p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
                  m.role === "Admin"
                    ? "bg-primary-container text-on-primary-container"
                    : "border text-muted-foreground",
                )}
              >
                {m.role}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className={cn(panel, "absolute right-0 bottom-0 w-52 p-3.5")}>
        <p className="text-xs font-semibold text-muted-foreground">Maya can see</p>
        <ul className="mt-2 space-y-2">
          {projects.map((p) => (
            <li
              key={p.name}
              className={cn(
                "flex items-center gap-2 text-sm",
                p.hidden ? "text-muted-foreground" : "text-foreground",
              )}
            >
              {p.hidden ? (
                <Lock className="h-4 w-4 shrink-0" strokeWidth={1.8} />
              ) : (
                <Check className="h-4 w-4 shrink-0 text-link" strokeWidth={2.2} />
              )}
              <span className="truncate">{p.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </Stage>
  );
}

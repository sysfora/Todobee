import { useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  AlignLeft,
  Calendar as CalendarIcon,
  Check,
  ChevronDown,
  CircleCheck,
  Circle,
  Flag,
  Plus,
  Trash2,
  Paperclip,
  Download,
  FileText,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { actions, uid, useAppState } from "@/lib/store";
import { formatDue, parseISODate, toISODate } from "@/lib/dates";
import type { Priority, Task } from "@/lib/types";
import { ColorDot, LabelChip, UserAvatar, iconAction } from "./primitives";
import { ink, tint } from "@/lib/colors";
import { ConfirmDialog } from "./ConfirmDialog";
import { burstFrom } from "./burst";

const PRIORITIES: { value: Priority; label: string; flag: string; color?: string }[] = [
  {
    value: "high",
    label: "High",
    flag: "text-priority-high fill-priority-high",
    color: "var(--priority-high)",
  },
  {
    value: "medium",
    label: "Medium",
    flag: "text-priority-medium fill-priority-medium",
    color: "var(--priority-medium)",
  },
  {
    value: "low",
    label: "Low",
    flag: "text-priority-low fill-priority-low",
    color: "var(--priority-low)",
  },
  { value: "none", label: "No Priority", flag: "text-muted-foreground" },
];

export function TaskDialog({ taskId, onClose }: { taskId: string | null; onClose: () => void }) {
  const state = useAppState();
  const task = state.tasks.find((t) => t.id === taskId);
  return (
    <Dialog open={!!task} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="flex max-h-[92dvh] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:rounded-3xl [&>button:last-child]:hidden"
      >
        {task && <TaskDetail task={task} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function TaskDetail({ task, onClose }: { task: Task; onClose: () => void }) {
  const state = useAppState();
  const project = state.projects.find((p) => p.id === task.projectId);
  const sections = state.sections
    .filter((s) => s.projectId === task.projectId)
    .sort((a, b) => a.order - b.order);
  const section = sections.find((s) => s.id === task.sectionId);
  const members = state.users.filter((u) => project?.memberIds.includes(u.id));
  const assignees = state.users.filter((u) => task.assigneeIds.includes(u.id));
  const taskLabels = state.labels.filter((l) => task.labelIds.includes(l.id));
  const priority = PRIORITIES.find((p) => p.value === task.priority)!;
  const [confirmDelete, setConfirmDelete] = useState(false);

  const update = (patch: Partial<Task>) => actions.updateTask(task.id, patch);

  return (
    <div className="flex max-h-[92dvh] min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b py-3 pr-4 pl-7">
        <DialogTitle className="flex min-w-0 items-center gap-3 text-base font-normal text-foreground">
          {project && <ColorDot color={project.color} />}
          <span>{project?.name}</span>
          <span className="text-muted-foreground">/</span>
          <span>{section?.name}</span>
        </DialogTitle>
        <DialogClose className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/8 hover:text-foreground">
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </DialogClose>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex min-h-full flex-col md:flex-row">
          {/* Main */}
          <div className="min-w-0 flex-1 space-y-7 px-7 py-6">
            <div className="flex items-center gap-3">
              <CompleteToggle
                done={task.completed}
                onToggle={() => actions.toggleTaskComplete(task.id)}
                large
              />
              <TitleInput
                value={task.title}
                done={task.completed}
                onSave={(title) => update({ title })}
              />
            </div>

            <Description
              value={task.description}
              onSave={(description) => update({ description })}
            />
            <Checklist task={task} />
            <Comments task={task} />
            <Files task={task} />
          </div>

          {/* Side panel */}
          <aside className="w-full shrink-0 bg-panel px-6 py-3 md:w-72">
            <SideBlock title="Section">
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="Section"
                  className="flex h-11 w-full items-center justify-between rounded-md border border-input bg-card px-3.5 text-sm text-foreground hover:border-foreground/40 focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none"
                >
                  <span className="truncate">{section?.name}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-(--radix-dropdown-menu-trigger-width)"
                >
                  {sections.map((s) => (
                    <DropdownMenuItem
                      key={s.id}
                      onSelect={() => actions.moveTask(task.id, s.id, null)}
                    >
                      <span className="flex-1">{s.name}</span>
                      {s.id === task.sectionId && <Check className="h-4 w-4" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </SideBlock>

            <SideBlock title="Priority">
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label={`Priority: ${priority.label}`}
                  className="flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  style={
                    priority.color
                      ? { backgroundColor: tint(priority.color), color: ink(priority.color) }
                      : { backgroundColor: "var(--tonal)", color: "var(--tonal-foreground)" }
                  }
                >
                  <Flag className={cn("h-4 w-4", priority.flag)} />
                  {priority.label}
                  <ChevronDown className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {PRIORITIES.map((p) => (
                    <DropdownMenuItem key={p.value} onSelect={() => update({ priority: p.value })}>
                      <Flag className={cn("mr-1 h-4 w-4", p.flag)} />
                      <span className="flex-1">{p.label}</span>
                      {p.value === task.priority && (
                        <Check className="h-4 w-4 text-muted-foreground" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </SideBlock>

            <SideBlock title="Due Date">
              <Popover>
                <PopoverTrigger
                  aria-label={`Due date: ${task.dueDate ? formatDue(task.dueDate) : "none"}`}
                  className="-ml-2 flex h-10 items-center gap-3 rounded-full px-2 text-[0.95rem] text-foreground hover:bg-foreground/8"
                >
                  <CalendarIcon className="h-5 w-5 text-muted-foreground" strokeWidth={1.6} />
                  {task.dueDate ? formatDue(task.dueDate) : "No due date"}
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={task.dueDate ? parseISODate(task.dueDate) : undefined}
                    {...(task.dueDate ? { defaultMonth: parseISODate(task.dueDate) } : {})}
                    onSelect={(d) => update({ dueDate: d ? toISODate(d) : undefined })}
                  />
                  {task.dueDate && (
                    <div className="border-t p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => update({ dueDate: undefined })}
                      >
                        Clear due date
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </SideBlock>

            <SideBlock
              title="Assignee"
              action={
                <Popover>
                  <PopoverTrigger
                    aria-label="Add assignee"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-foreground hover:bg-foreground/8"
                  >
                    <Plus className="h-5 w-5" strokeWidth={1.6} />
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-64 px-0 py-2">
                    {members.length === 0 && (
                      <p className="p-3 text-sm text-muted-foreground">
                        This project has no members yet.
                      </p>
                    )}
                    {members.map((u) => {
                      const on = task.assigneeIds.includes(u.id);
                      return (
                        <button
                          key={u.id}
                          onClick={() =>
                            update({
                              assigneeIds: on
                                ? task.assigneeIds.filter((a) => a !== u.id)
                                : [...task.assigneeIds, u.id],
                            })
                          }
                          className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-muted"
                        >
                          <UserAvatar user={u} className="h-6 w-6 ring-0" />
                          <span className="flex-1 truncate">{u.name}</span>
                          {on && <Check className="h-4 w-4 text-primary" />}
                        </button>
                      );
                    })}
                  </PopoverContent>
                </Popover>
              }
            >
              {assignees.length === 0 ? (
                <span className="text-sm text-muted-foreground">No assignee</span>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {assignees.map((u) => (
                    <UserAvatar key={u.id} user={u} className="h-9 w-9 ring-0" />
                  ))}
                </div>
              )}
            </SideBlock>

            <SideBlock
              title="Labels"
              action={
                <Popover>
                  <PopoverTrigger
                    aria-label="Add label"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-foreground hover:bg-foreground/8"
                  >
                    <Plus className="h-5 w-5" strokeWidth={1.6} />
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-60 px-0 py-2">
                    {state.labels.map((l) => {
                      const on = task.labelIds.includes(l.id);
                      return (
                        <button
                          key={l.id}
                          onClick={() =>
                            update({
                              labelIds: on
                                ? task.labelIds.filter((x) => x !== l.id)
                                : [...task.labelIds, l.id],
                            })
                          }
                          className="flex w-full items-center gap-2 px-4 py-2 hover:bg-muted"
                        >
                          <LabelChip label={l} />
                          <span className="flex-1" />
                          {on && <Check className="h-4 w-4 text-primary" />}
                        </button>
                      );
                    })}
                  </PopoverContent>
                </Popover>
              }
            >
              {taskLabels.length === 0 ? (
                <span className="text-sm text-muted-foreground">No labels</span>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {taskLabels.map((l) => (
                    <LabelChip key={l.id} label={l} pill />
                  ))}
                </div>
              )}
            </SideBlock>

            <div className="py-4">
              <button
                onClick={() => setConfirmDelete(true)}
                className="-ml-2 flex h-10 items-center gap-3 rounded-full px-3 text-sm font-medium text-foreground hover:bg-destructive/10 hover:text-danger"
              >
                <Trash2 className="h-5 w-5" strokeWidth={1.6} /> Delete
              </button>
            </div>
          </aside>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this task?"
        description={`"${task.title}" will be permanently removed.`}
        onConfirm={() => {
          onClose();
          actions.deleteTask(task.id);
        }}
      />
    </div>
  );
}

export function CompleteToggle({
  done,
  onToggle,
  large,
}: {
  done: boolean;
  onToggle: () => void;
  large?: boolean;
}) {
  const size = large ? "h-7 w-7" : "h-5 w-5";
  const [popped, setPopped] = useState(false);
  return (
    <button
      aria-label={done ? "Mark as not done" : "Mark as done"}
      onClick={(e) => {
        e.stopPropagation();
        if (!done) {
          burstFrom(e.currentTarget);
          setPopped(true);
        } else setPopped(false);
        onToggle();
      }}
      className="shrink-0 rounded-full text-subtle transition-colors hover:text-check focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {done ? (
        <CircleCheck
          className={cn(size, "fill-check text-card", popped && "task-check-pop")}
          strokeWidth={2}
        />
      ) : (
        <Circle className={size} strokeWidth={1.4} />
      )}
    </button>
  );
}

function TitleInput({
  value,
  done,
  onSave,
}: {
  value: string;
  done: boolean;
  onSave: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    const t = draft.trim();
    if (t && t !== value) onSave(t);
    else setDraft(value);
  };
  return (
    <input
      aria-label="Task title"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className={cn(
        "w-full rounded-md bg-transparent px-1 text-2xl font-semibold tracking-tight text-foreground outline-none focus:bg-muted",
        done && "text-muted-foreground line-through",
      )}
    />
  );
}

function Description({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <div className="flex gap-4">
      <AlignLeft className="mt-1 ml-1 h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.6} />
      {editing ? (
        <div className="flex-1 rounded-xl border border-primary bg-card p-3 ring-1 ring-primary">
          <Textarea
            autoFocus
            aria-label="Description"
            placeholder="Add a description…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="min-h-16 resize-none border-0 p-0 shadow-none focus-visible:ring-0"
          />
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={() => {
                onSave(draft.trim());
                setEditing(false);
              }}
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setDraft(value);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className={cn(
            "flex-1 rounded-md px-1 text-left whitespace-pre-wrap hover:bg-muted",
            value ? "text-sm text-foreground" : "text-muted-foreground",
          )}
        >
          {value || "Add a description…"}
        </button>
      )}
    </div>
  );
}

function Checklist({ task }: { task: Task }) {
  const [open, setOpen] = useState(true);
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const done = task.checklist.filter((c) => c.done).length;
  const setList = (checklist: Task["checklist"]) => actions.updateTask(task.id, { checklist });

  const add = () => {
    const t = text.trim();
    if (!t) return;
    setList([...task.checklist, { id: uid("c"), text: t, done: false }]);
    setText("");
    inputRef.current?.focus();
  };

  return (
    <div>
      <SectionHeader
        open={open}
        onToggle={() => setOpen(!open)}
        title="Checklist"
        count={`${done}/${task.checklist.length}`}
      />
      {open && (
        <div className="ml-8 space-y-0.5 pt-2">
          {task.checklist.map((c) => (
            <div
              key={c.id}
              className="group flex items-center gap-3 rounded-lg px-1 py-1.5 hover:bg-muted"
            >
              <input
                type="checkbox"
                checked={c.done}
                onChange={() =>
                  setList(task.checklist.map((x) => (x.id === c.id ? { ...x, done: !x.done } : x)))
                }
                aria-label={c.text}
                className="h-[1.125rem] w-[1.125rem] accent-primary"
              />
              <span
                className={cn("flex-1 text-sm", c.done && "text-muted-foreground line-through")}
              >
                {c.text}
              </span>
              <button
                aria-label={`Remove checklist item: ${c.text}`}
                onClick={() => setList(task.checklist.filter((x) => x.id !== c.id))}
                className={cn(
                  iconAction,
                  "h-8 w-8 hover:text-danger focus-visible:opacity-100 pointer-coarse:opacity-100 md:opacity-0 md:group-hover:opacity-100",
                )}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          {adding ? (
            <div className="flex overflow-hidden rounded-xl border border-primary bg-card ring-1 ring-primary">
              <input
                ref={inputRef}
                autoFocus
                value={text}
                aria-label="New checklist item"
                placeholder="Enter checklist item"
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") add();
                  if (e.key === "Escape") setAdding(false);
                }}
                className="flex-1 bg-transparent px-3.5 py-2.5 text-sm outline-none"
              />
              <button
                aria-label="Cancel"
                onClick={() => {
                  setAdding(false);
                  setText("");
                }}
                className="border-l px-4 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
              <button
                aria-label="Add"
                onClick={add}
                className="border-l px-4 text-muted-foreground hover:bg-muted"
              >
                <Check className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="-ml-2 flex h-10 items-center gap-3 rounded-full px-3 font-medium text-primary hover:bg-primary/8"
            >
              <Plus className="h-5 w-5" /> Add item
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Comments({ task }: { task: Task }) {
  const state = useAppState();
  const [open, setOpen] = useState(true);
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState("");

  const save = () => {
    const t = text.trim();
    if (!t) return;
    actions.updateTask(task.id, {
      comments: [
        ...task.comments,
        { id: uid("m"), userId: state.currentUserId, text: t, createdAt: new Date().toISOString() },
      ],
    });
    setText("");
    setFocused(false);
  };

  return (
    <div>
      <SectionHeader
        open={open}
        onToggle={() => setOpen(!open)}
        title="Notes"
        count={String(task.comments.length)}
      />
      {open && (
        <div className="ml-8 space-y-4 pt-4">
          {task.comments.map((c) => {
            const author = state.users.find((u) => u.id === c.userId);
            return (
              <div key={c.id} className="flex gap-3">
                <UserAvatar user={author} className="h-8 w-8 ring-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium text-foreground">
                      {author?.name ?? "Former member"}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                    </span>
                  </p>
                  <p className="mt-0.5 text-sm whitespace-pre-wrap text-foreground">{c.text}</p>
                </div>
                {c.userId === state.currentUserId && (
                  <button
                    aria-label="Delete note"
                    onClick={() =>
                      actions.updateTask(task.id, {
                        comments: task.comments.filter((x) => x.id !== c.id),
                      })
                    }
                    className={cn(iconAction, "-mt-1.5 h-8 w-8 self-start hover:text-danger")}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.6} />
                  </button>
                )}
              </div>
            );
          })}
          <div className="rounded-xl border border-input bg-card px-3.5 py-3 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
            <Textarea
              aria-label="Write a note"
              placeholder="Write a note…"
              value={text}
              onFocus={() => setFocused(true)}
              onChange={(e) => setText(e.target.value)}
              className={cn(
                "resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0",
                focused ? "min-h-14" : "min-h-0 h-6",
              )}
            />
            {focused && (
              <div className="mt-2 flex gap-2">
                <Button size="sm" onClick={save}>
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setText("");
                    setFocused(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({
  open,
  onToggle,
  title,
  count,
}: {
  open: boolean;
  onToggle: () => void;
  title: string;
  count: string;
}) {
  return (
    <button
      onClick={onToggle}
      aria-expanded={open}
      className="flex w-full items-center gap-3 rounded-md text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <ChevronDown
        className={cn("h-5 w-5 text-muted-foreground transition-transform", !open && "-rotate-90")}
        strokeWidth={1.6}
      />
      <span className="flex flex-1 items-center gap-2 border-b pb-2.5 text-[1.05rem] font-semibold text-foreground">
        {title} <span className="font-normal text-muted-foreground">{count}</span>
      </span>
    </button>
  );
}

function SideBlock({
  title,
  action,
  children,
  last,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className={cn("py-4", !last && "border-b")}>
      <div className="mb-3 flex min-h-8 items-center justify-between">
        <h3 className="font-semibold text-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Files({ task }: { task: Task }) {
  const state = useAppState();
  const [open, setOpen] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const files = task.files ?? [];

  const add = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const readAsDataUrl = (f: File) =>
      new Promise<string | undefined>((res) => {
        if (f.size > 2 * 1024 * 1024) return res(undefined);
        const r = new FileReader();
        r.onload = () => res(typeof r.result === "string" ? r.result : undefined);
        r.onerror = () => res(undefined);
        r.readAsDataURL(f);
      });
    const added = await Promise.all(
      Array.from(list).map(async (f) => ({
        id: uid("f"),
        name: f.name,
        size: f.size,
        mimeType: f.type,
        userId: state.currentUserId,
        createdAt: new Date().toISOString(),
        dataUrl: await readAsDataUrl(f),
      })),
    );
    actions.updateTask(task.id, { files: [...files, ...added] });
    if (inputRef.current) inputRef.current.value = "";
  };

  const download = (f: (typeof files)[number]) => {
    const href = f.driveUrl ?? f.dataUrl;
    if (!href) {
      toast("Download isn't available yet", {
        description: "Large files can be downloaded once Google Drive is connected.",
      });
      return;
    }
    const a = document.createElement("a");
    a.href = href;
    a.download = f.name;
    if (f.driveUrl) a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div>
      <SectionHeader
        open={open}
        onToggle={() => setOpen(!open)}
        title="Files"
        count={String(files.length)}
      />
      {open && (
        <div className="ml-8 space-y-2 pt-4">
          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-3 rounded-xl border bg-card px-3.5 py-2.5"
            >
              <FileText className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.6} />
              <div className="min-w-0 flex-1">
                {f.driveUrl ? (
                  <a
                    href={f.driveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-sm font-medium text-link hover:underline"
                  >
                    {f.name}
                  </a>
                ) : (
                  <p className="truncate text-sm font-medium text-foreground">{f.name}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {formatSize(f.size)} ·{" "}
                  {formatDistanceToNow(new Date(f.createdAt), { addSuffix: true })}
                </p>
              </div>
              <button
                aria-label={`Download ${f.name}`}
                onClick={() => download(f)}
                className={cn(iconAction, "h-8 w-8")}
              >
                <Download className="h-4 w-4" strokeWidth={1.6} />
              </button>
              <button
                aria-label={`Remove ${f.name}`}
                onClick={() =>
                  actions.updateTask(task.id, { files: files.filter((x) => x.id !== f.id) })
                }
                className={cn(iconAction, "h-8 w-8 hover:text-danger")}
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.6} />
              </button>
            </div>
          ))}
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => add(e.target.files)}
          />
          <Button
            variant="tonal"
            className="rounded-xl px-5"
            onClick={() => inputRef.current?.click()}
          >
            <Paperclip /> Attach files
          </Button>
        </div>
      )}
    </div>
  );
}

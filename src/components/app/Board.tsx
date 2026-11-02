import { useRef, useState } from "react";
import {
  Calendar as CalendarIcon,
  CircleCheck,
  MessageCircle,
  MoreVertical,
  Plus,
} from "lucide-react";
import { actions, useAppState } from "@/lib/store";
import { formatDue } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { Section, Task } from "@/lib/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AvatarStack, LabelChip } from "./primitives";
import { CompleteToggle } from "./TaskDialog";
import { ConfirmDialog } from "./ConfirmDialog";
import { isTouchDragging, startTouchDrag, touchDragJustEnded, type DropTarget } from "./touch-drag";

const priorityBorder: Record<Task["priority"], string> = {
  high: "border-l-4 border-l-priority-high",
  medium: "border-l-4 border-l-priority-medium",
  low: "border-l-4 border-l-priority-low",
  none: "",
};

export function Board({
  projectId,
  sections,
  tasksBySection,
  onOpenTask,
}: {
  projectId: string;
  sections: Section[];
  tasksBySection: Map<string, Task[]>;
  onOpenTask: (id: string) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [drop, setDrop] = useState<DropTarget>(null);

  const finishDrop = () => {
    if (dragId && drop) actions.moveTask(dragId, drop.sectionId, drop.beforeId);
    setDragId(null);
    setDrop(null);
  };

  // Phones: press and hold a card, then drag it with your finger.
  const touchDrag = (e: React.TouchEvent<HTMLElement>, id: string) =>
    startTouchDrag(e, {
      id,
      onStart: setDragId,
      onTarget: setDrop,
      onEnd: (taskId, target) => {
        if (target) actions.moveTask(taskId, target.sectionId, target.beforeId);
        setDragId(null);
        setDrop(null);
      },
    });

  return (
    <div
      data-board-scroll
      className="flex h-full items-start gap-4 overflow-x-auto px-4 pb-6 md:px-8 scrollbar-thin"
    >
      {sections.map((s) => (
        <Column
          key={s.id}
          section={s}
          tasks={tasksBySection.get(s.id) ?? []}
          dragId={dragId}
          drop={drop}
          setDrop={setDrop}
          onDragStart={setDragId}
          onDragEnd={() => {
            setDragId(null);
            setDrop(null);
          }}
          onDrop={finishDrop}
          onTouchDrag={touchDrag}
          onOpenTask={onOpenTask}
          projectId={projectId}
        />
      ))}
      <AddSection projectId={projectId} />
    </div>
  );
}

function Column({
  section,
  tasks,
  projectId,
  dragId,
  drop,
  setDrop,
  onDragStart,
  onDragEnd,
  onDrop,
  onTouchDrag,
  onOpenTask,
}: {
  section: Section;
  tasks: Task[];
  projectId: string;
  dragId: string | null;
  drop: DropTarget;
  setDrop: (d: DropTarget) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDrop: () => void;
  onTouchDrag: (e: React.TouchEvent<HTMLElement>, id: string) => void;
  onOpenTask: (id: string) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(section.name);
  const [confirm, setConfirm] = useState(false);
  const isTarget = drop?.sectionId === section.id;
  // Deleting removes every task in the section, including hidden/completed ones
  const totalTasks = useAppState().tasks.filter((t) => t.sectionId === section.id).length;

  const commitRename = () => {
    const n = name.trim();
    if (n) actions.renameSection(section.id, n);
    else setName(section.name);
    setRenaming(false);
  };

  const listRef = useRef<HTMLDivElement>(null);

  return (
    <div
      data-section-id={section.id}
      className="flex max-h-full w-[85vw] max-w-80 shrink-0 flex-col rounded-2xl bg-column sm:w-80"
      onDragOver={(e) => {
        if (!dragId) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        // Place the slot before the first card whose middle is below the cursor (ignores the slot itself, so it never flickers)
        const cards = Array.from(
          listRef.current?.querySelectorAll<HTMLElement>("[data-task-card]") ?? [],
        ).filter((el) => el.dataset["taskCard"] !== dragId);
        const next = cards.find((el) => {
          const r = el.getBoundingClientRect();
          return e.clientY < r.top + r.height / 2;
        });
        const beforeId = next?.dataset["taskCard"] ?? null;
        if (!isTarget || drop?.beforeId !== beforeId) setDrop({ sectionId: section.id, beforeId });
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
    >
      <div className="flex items-center justify-between py-2.5 pr-2 pl-4">
        {renaming ? (
          <input
            autoFocus
            aria-label="Section name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setName(section.name);
                setRenaming(false);
              }
            }}
            className="w-40 rounded-md border border-primary bg-card px-2 py-1 font-semibold ring-1 ring-primary outline-none"
          />
        ) : (
          <h2 className="text-[1.05rem] font-semibold text-foreground">
            {section.name}
            <span className="ml-3 text-sm font-normal text-muted-foreground">{tasks.length}</span>
          </h2>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Options for section ${section.name}`}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/8 hover:text-foreground"
          >
            <MoreVertical className="h-5 w-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setRenaming(true)}>Rename section</DropdownMenuItem>
            <DropdownMenuItem
              className="text-danger focus:text-danger"
              onSelect={() => setConfirm(true)}
            >
              Delete section
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div
        ref={listRef}
        data-section-list
        className="flex min-h-2 flex-1 flex-col gap-2.5 overflow-y-auto px-2.5 pt-0.5 pb-1 scrollbar-thin"
      >
        {tasks.map((t, i) => (
          <div key={t.id} className="contents">
            {isTarget && drop?.beforeId === t.id && <DropLine />}
            <TaskCard
              task={t}
              dragging={dragId === t.id}
              onOpen={() => onOpenTask(t.id)}
              onDragStart={() => {
                onDragStart(t.id);
                setDrop({ sectionId: section.id, beforeId: tasks[i + 1]?.id ?? null });
              }}
              onDragEnd={onDragEnd}
              onTouchStart={(e) => onTouchDrag(e, t.id)}
            />
          </div>
        ))}
        {isTarget && drop?.beforeId === null && dragId && <DropLine />}
      </div>

      <AddTask projectId={projectId} sectionId={section.id} />

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`Delete "${section.name}"?`}
        description={`This section and its ${totalTasks} ${totalTasks === 1 ? "task" : "tasks"} will be permanently removed.`}
        onConfirm={() => actions.deleteSection(section.id)}
      />
    </div>
  );
}

const DropLine = () => (
  <div className="h-14 shrink-0 rounded-md border-2 border-dashed border-primary/40 bg-primary/5" />
);

function TaskCard({
  task,
  dragging,
  onOpen,
  onDragStart,
  onDragEnd,
  onTouchStart,
  fixed,
}: {
  task: Task;
  dragging: boolean;
  onOpen: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onTouchStart?: (e: React.TouchEvent<HTMLElement>) => void;
  fixed?: boolean;
}) {
  const open = () => {
    if (!touchDragJustEnded()) onOpen();
  };
  const state = useAppState();
  const labels = state.labels.filter((l) => task.labelIds.includes(l.id));
  const assignees = state.users.filter((u) => task.assigneeIds.includes(u.id));
  const checkDone = task.checklist.filter((c) => c.done).length;
  const hasMeta =
    task.dueDate || task.checklist.length > 0 || task.comments.length > 0 || assignees.length > 0;

  return (
    <div
      data-task-card={task.id}
      draggable={!fixed}
      onTouchStart={fixed ? undefined : onTouchStart}
      onDragStart={(e) => {
        // On touch screens the finger drag above takes over from the browser's own
        if (isTouchDragging()) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", task.id);
        // Lifted, slightly tilted preview of the card while dragging (wrapper gives room for the tilt)
        const el = e.currentTarget;
        const rect = el.getBoundingClientRect();
        const wrap = document.createElement("div");
        wrap.style.cssText = `position:fixed;top:-2000px;left:-2000px;padding:16px;pointer-events:none;`;
        const ghost = el.cloneNode(true) as HTMLElement;
        ghost.style.cssText = `width:${rect.width}px;transform:rotate(3deg);box-shadow:var(--shadow-panel);opacity:1;`;
        wrap.appendChild(ghost);
        document.body.appendChild(wrap);
        e.dataTransfer.setDragImage(wrap, e.clientX - rect.left + 16, e.clientY - rect.top + 16);
        setTimeout(() => wrap.remove(), 0);
        // Hide the original after the browser has captured the drag image; the slot takes its place
        setTimeout(() => onDragStart(), 0);
      }}
      onDragEnd={onDragEnd}
      onClick={open}
      className={cn(
        "shrink-0 rounded-md bg-card [-webkit-touch-callout:none] select-none px-4 py-3.5 shadow-raised transition-shadow hover:shadow-panel",
        fixed ? "cursor-pointer" : "cursor-grab active:cursor-grabbing",
        priorityBorder[task.priority],
        dragging && "hidden",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="pt-0.5">
          <CompleteToggle
            done={task.completed}
            onToggle={() => actions.toggleTaskComplete(task.id)}
          />
        </div>
        {/* The title is the keyboard/screen-reader way to open the task; the whole card works for mouse and touch */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            open();
          }}
          className={cn(
            "min-w-0 flex-1 rounded-sm text-left text-[0.95rem] leading-snug font-medium [overflow-wrap:anywhere] text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            task.completed && "font-normal text-muted-foreground line-through",
          )}
        >
          {task.title}
        </button>
      </div>
      {labels.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5 pl-8">
          {labels.map((l) => (
            <LabelChip key={l.id} label={l} />
          ))}
        </div>
      )}
      {hasMeta && (
        <div className="mt-3 flex items-center gap-4 pl-8 text-sm text-muted-foreground">
          {task.dueDate && (
            <span className="flex items-center gap-1.5">
              <CalendarIcon className="h-4 w-4" strokeWidth={1.5} />
              {formatDue(task.dueDate)}
            </span>
          )}
          {task.checklist.length > 0 && (
            <span className="flex items-center gap-1">
              <CircleCheck className="h-4 w-4" strokeWidth={1.5} />
              {checkDone}/{task.checklist.length}
            </span>
          )}
          {task.comments.length > 0 && (
            <span className="flex items-center gap-1">
              <MessageCircle className="h-4 w-4" strokeWidth={1.5} />
              {task.comments.length}
            </span>
          )}
          <span className="flex-1" />
          <AvatarStack users={assignees} max={1} size="h-6 w-6" />
        </div>
      )}
    </div>
  );
}

function AddTask({ projectId, sectionId }: { projectId: string; sectionId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  const add = () => {
    const t = title.trim();
    if (t) actions.createTask(projectId, sectionId, t);
    setTitle("");
    ref.current?.focus();
  };

  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="m-2 flex h-10 items-center gap-3 rounded-full px-3 text-foreground hover:bg-foreground/8"
      >
        <Plus className="h-5 w-5" strokeWidth={1.8} /> Add task
      </button>
    );

  return (
    <div className="p-2.5">
      <textarea
        ref={ref}
        autoFocus
        aria-label="Task name"
        rows={2}
        value={title}
        placeholder="Task name"
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            add();
          }
          if (e.key === "Escape") setOpen(false);
        }}
        className="w-full resize-none rounded-xl bg-card px-3.5 py-2.5 text-sm shadow-raised outline-none focus:ring-2 focus:ring-primary"
      />
      <div className="mt-2 flex gap-2">
        <button
          onClick={add}
          className="h-9 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Add task
        </button>
        <button
          onClick={() => {
            setOpen(false);
            setTitle("");
          }}
          className="h-9 rounded-full px-4 text-sm font-medium text-primary hover:bg-primary/8"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function AddSection({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const commit = () => {
    const n = name.trim();
    if (n) actions.createSection(projectId, n);
    setName("");
    setOpen(false);
  };
  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex h-12 w-72 shrink-0 items-center gap-3 rounded-2xl border border-dashed border-input px-4 text-muted-foreground hover:bg-foreground/5 hover:text-foreground sm:w-80"
      >
        <Plus className="h-4 w-4" /> Add section
      </button>
    );
  return (
    <div className="w-72 shrink-0 rounded-2xl bg-column p-2.5 sm:w-80">
      <input
        autoFocus
        aria-label="Section name"
        value={name}
        placeholder="Section name"
        onChange={(e) => setName(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setOpen(false);
        }}
        className="w-full rounded-xl bg-card px-3.5 py-2.5 text-sm shadow-raised outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}

/** Read-only columns when the board is grouped by something other than sections. */
export function GroupedBoard({
  groups,
  onOpenTask,
}: {
  groups: { id: string; name: string; tasks: Task[] }[];
  onOpenTask: (id: string) => void;
}) {
  return (
    <div className="flex h-full items-start gap-4 overflow-x-auto px-4 pb-6 md:px-8 scrollbar-thin">
      {groups.map((g) => (
        <div
          key={g.id}
          className="flex max-h-full w-[85vw] max-w-80 shrink-0 flex-col rounded-2xl bg-column sm:w-80"
        >
          <h2 className="py-3.5 pr-2 pl-4 text-[1.05rem] font-semibold text-foreground">
            {g.name}
            <span className="ml-3 text-sm font-normal text-muted-foreground">{g.tasks.length}</span>
          </h2>
          <div className="flex min-h-2 flex-1 flex-col gap-2.5 overflow-y-auto px-2.5 pt-0.5 pb-3 scrollbar-thin">
            {g.tasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                dragging={false}
                fixed
                onOpen={() => onOpenTask(t.id)}
                onDragStart={() => {}}
                onDragEnd={() => {}}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

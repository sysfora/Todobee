"use client";

import { Calendar as CalendarIcon, CircleCheck, Flag, MessageCircle } from "lucide-react";
import { actions, useAppState } from "@/lib/store";
import { formatDue } from "@/lib/dates";
import type { Priority, Task } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AvatarStack, LabelChip } from "./primitives";
import { CompleteToggle } from "./TaskDialog";

const priorityFlag: Record<Priority, { cls: string; label: string }> = {
  high: { cls: "text-priority-high fill-priority-high", label: "High priority" },
  medium: { cls: "text-priority-medium fill-priority-medium", label: "Medium priority" },
  low: { cls: "text-priority-low fill-priority-low", label: "Low priority" },
  none: { cls: "text-muted-foreground", label: "No priority" },
};

/**
 * List view of the tasks, grouped by sections or by the active Group By choice.
 * Rows are read-only except for the completion toggle, like the grouped board.
 */
export function TaskList({
  groups,
  onOpenTask,
}: {
  groups: { id: string; name: string; tasks: Task[] }[];
  onOpenTask: (id: string) => void;
}) {
  return (
    <div className="scrollbar-thin h-full overflow-y-auto px-4 pb-6 md:px-8">
      {groups.map((g) => (
        <section key={g.id} aria-label={g.name} className="mb-5">
          <div className="flex items-baseline gap-3 px-1 pt-2 pb-2">
            <h2 className="text-[1.05rem] font-semibold text-foreground">{g.name}</h2>
            <span className="text-sm text-muted-foreground">{g.tasks.length}</span>
          </div>
          {g.tasks.length > 0 && (
            <ul className="divide-y overflow-hidden rounded-lg bg-card shadow-card">
              {g.tasks.map((t) => (
                <TaskRow key={t.id} task={t} onOpen={() => onOpenTask(t.id)} />
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

function TaskRow({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const state = useAppState();
  const labels = state.labels.filter((l) => task.labelIds.includes(l.id));
  const assignees = state.users.filter((u) => task.assigneeIds.includes(u.id));
  const checkDone = task.checklist.filter((c) => c.done).length;
  const prio = priorityFlag[task.priority];
  const hasMeta =
    task.dueDate || task.checklist.length > 0 || task.comments.length > 0 || assignees.length > 0;

  return (
    <li
      className="flex cursor-pointer items-center gap-3 py-2.5 pr-4 pl-4 transition-colors hover:bg-panel"
      onClick={onOpen}
    >
      <CompleteToggle done={task.completed} onToggle={() => actions.toggleTaskComplete(task.id)} />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
        className={cn(
          "min-w-0 flex-1 rounded-sm text-left text-[0.95rem] leading-snug font-medium [overflow-wrap:anywhere] text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          task.completed && "font-normal text-muted-foreground line-through",
        )}
      >
        {task.title}
      </button>
      {labels.length > 0 && (
        <div className="hidden shrink-0 items-center gap-1.5 md:flex">
          {labels.slice(0, 2).map((l) => (
            <LabelChip key={l.id} label={l} />
          ))}
          {labels.length > 2 && (
            <span className="text-xs text-muted-foreground">+{labels.length - 2}</span>
          )}
        </div>
      )}
      {hasMeta && (
        <div className="flex shrink-0 items-center gap-4 text-sm text-muted-foreground">
          {task.dueDate && (
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <CalendarIcon className="h-4 w-4" strokeWidth={1.5} />
              <span className="hidden sm:inline">{formatDue(task.dueDate)}</span>
              <span className="sm:hidden">{formatDue(task.dueDate).slice(0, 6)}</span>
            </span>
          )}
          {task.checklist.length > 0 && (
            <span className="hidden items-center gap-1 sm:flex" aria-hidden>
              <CircleCheck className="h-4 w-4" strokeWidth={1.5} />
              {checkDone}/{task.checklist.length}
            </span>
          )}
          {task.comments.length > 0 && (
            <span className="hidden items-center gap-1 sm:flex" aria-hidden>
              <MessageCircle className="h-4 w-4" strokeWidth={1.5} />
              {task.comments.length}
            </span>
          )}
          <AvatarStack users={assignees} max={1} size="h-6 w-6" />
        </div>
      )}
      {task.priority !== "none" && (
        <span title={prio.label} className="flex shrink-0">
          <Flag className={cn("h-4 w-4", prio.cls)} strokeWidth={1.8} aria-label={prio.label} />
        </span>
      )}
    </li>
  );
}

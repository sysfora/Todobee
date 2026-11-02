"use client";
import { Link } from "@/lib/nav";
import { useMemo, useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { actions, useAppState } from "@/lib/store";
import { groupMyTasks, type DueGroup } from "@/lib/task-utils";
import { formatDue, todayISO } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { AvatarStack, ColorDot, PageTitle } from "@/components/app/primitives";
import { CompleteToggle, TaskDialog } from "@/components/app/TaskDialog";


const GROUPS: { key: DueGroup; title: string }[] = [
  { key: "today", title: "Today" },
  { key: "overdue", title: "Overdue" },
  { key: "upcoming", title: "Upcoming" },
  { key: "none", title: "No due date" },
];

export function MyTasks() {
  const state = useAppState();
  const [openTask, setOpenTask] = useState<string | null>(null);
  const groups = useMemo(() => groupMyTasks(state.tasks, state.currentUserId, todayISO()), [state]);
  const total = GROUPS.reduce((n, g) => n + groups[g.key].length, 0);

  const complete = (id: string, title: string) => {
    actions.toggleTaskComplete(id);
    toast.success(`"${title}" completed`, {
      action: { label: "Undo", onClick: () => actions.toggleTaskComplete(id) },
    });
  };

  return (
    <div className="space-y-5 px-4 py-6 md:px-8">
      <PageTitle>My Tasks</PageTitle>
      {total === 0 && (
        <div className="rounded-lg bg-card px-6 py-16 text-center shadow-card">
          <p className="font-medium text-foreground">No open tasks assigned to you</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Head over to{" "}
            <Link to="/projects" className="text-link hover:underline">
              Projects
            </Link>{" "}
            to pick something up.
          </p>
        </div>
      )}
      {GROUPS.filter((g) => groups[g.key].length > 0).map((g) => (
        <section key={g.key} className="overflow-hidden rounded-lg bg-card shadow-card">
          <h2 className="border-b px-6 py-4 text-lg font-medium text-foreground">
            {g.title}{" "}
            <span className="ml-1 text-sm text-muted-foreground">({groups[g.key].length})</span>
          </h2>
          <ul className="divide-y">
            {groups[g.key].map((t) => {
              const project = state.projects.find((p) => p.id === t.projectId);
              const assignees = state.users.filter((u) => t.assigneeIds.includes(u.id));
              return (
                <li
                  key={t.id}
                  onClick={() => setOpenTask(t.id)}
                  className="flex cursor-pointer items-center gap-3 px-4 py-4 hover:bg-panel sm:gap-4 sm:px-6"
                >
                  <div className="flex min-w-0 flex-1 gap-4">
                    <div className="pt-0.5">
                      <CompleteToggle
                        done={t.completed}
                        onToggle={() => complete(t.id, t.title)}
                        large
                      />
                    </div>
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenTask(t.id);
                        }}
                        className="block max-w-full truncate rounded-sm text-left text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        {t.title}
                      </button>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
                        {t.dueDate && (
                          <span
                            className={cn(
                              "flex items-center gap-2",
                              g.key === "overdue" && "text-danger",
                            )}
                          >
                            <CalendarIcon className="h-4 w-4" strokeWidth={1.6} />
                            {formatDue(t.dueDate)}
                          </span>
                        )}
                        {project && (
                          <span className="flex items-center gap-2">
                            <ColorDot color={project.color} className="h-2 w-2" />
                            {project.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <AvatarStack users={assignees} size="h-8 w-8" />
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <TaskDialog taskId={openTask} onClose={() => setOpenTask(null)} />
    </div>
  );
}

"use client";
import { Link, useNavigate } from "@/lib/nav";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, CircleCheck, Columns3, Filter, List, Plus, Rows3, Star } from "lucide-react";
import { actions, useAppState } from "@/lib/store";
import {
  emptyFilter,
  groupTasks,
  isFilterActive,
  matchesFilter,
  type GroupBy,
  type TaskFilter,
} from "@/lib/task-utils";
import { todayISO } from "@/lib/dates";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AvatarStack, ColorDot } from "@/components/app/primitives";
import { Board, GroupedBoard } from "@/components/app/Board";
import { TaskList } from "@/components/app/TaskList";
import { FiltersPanel } from "@/components/app/FiltersPanel";
import { TaskDialog } from "@/components/app/TaskDialog";
import { MemberPicker } from "@/components/app/MemberPicker";

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: "sections", label: "Sections" },
  { value: "assigned", label: "Assigned" },
  { value: "priority", label: "Priority" },
  { value: "labels", label: "Labels" },
  { value: "due", label: "Due Date" },
];

export function ProjectBoard() {
  const { projectId: routeProjectId = "" } = useParams<{ projectId: string }>();
  const projectId = routeProjectId.startsWith("p-") ? `prj-${routeProjectId.slice(2)}` : routeProjectId;
  const openTaskId = useSearchParams().get("task") ?? undefined;
  const navigate = useNavigate();
  const state = useAppState();
  useEffect(() => {
    if (!routeProjectId.startsWith("p-")) return;
    const task = openTaskId ? `?task=${encodeURIComponent(openTaskId)}` : "";
    navigate({ to: `/projects/${projectId}${task}`, replace: true });
  }, [navigate, openTaskId, projectId, routeProjectId]);
  const project = state.projects.find((p) => p.id === projectId);
  const [filter, setFilter] = useState<TaskFilter>(emptyFilter);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupBy>("sections");
  const [view, setView] = useState<"board" | "list">("board");

  const sections = useMemo(
    () => state.sections.filter((s) => s.projectId === projectId).sort((a, b) => a.order - b.order),
    [state.sections, projectId],
  );

  const visibleTasks = useMemo(
    () =>
      state.tasks
        .filter((t) => t.projectId === projectId)
        .filter((t) => showCompleted || !t.completed)
        .filter((t) => matchesFilter(t, filter, state.currentUserId, todayISO()))
        .sort((a, b) => a.order - b.order),
    [state.tasks, projectId, showCompleted, filter, state.currentUserId],
  );

  const tasksBySection = useMemo(() => {
    const map = new Map<string, Task[]>();
    visibleTasks.forEach((t) => map.set(t.sectionId, [...(map.get(t.sectionId) ?? []), t]));
    return map;
  }, [visibleTasks]);

  const listGroups = useMemo(() => {
    if (groupBy === "sections")
      return sections.map((s) => ({
        id: s.id,
        name: s.name,
        tasks: tasksBySection.get(s.id) ?? [],
      }));
    return groupTasks(visibleTasks, groupBy, {
      users: state.users.filter((u) => project?.memberIds.includes(u.id)),
      labels: state.labels,
      today: todayISO(),
      meId: state.currentUserId,
    });
  }, [
    groupBy,
    sections,
    tasksBySection,
    visibleTasks,
    state.users,
    state.labels,
    state.currentUserId,
    project?.memberIds,
  ]);

  const setOpenTask = (id: string | null) =>
    navigate({ search: id ? { task: id } : {}, replace: true });

  if (!project) {
    return (
      <div className="px-4 py-24 text-center md:px-8">
        <h1 className="text-xl font-semibold text-foreground">Project not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">It may have been deleted.</p>
        <Link to="/projects" className="mt-4 inline-block font-medium text-link hover:underline">
          Back to projects
        </Link>
      </div>
    );
  }

  const members = state.users.filter((u) => project.memberIds.includes(u.id));
  const me = state.users.find((u) => u.id === state.currentUserId);
  const filterActive = isFilterActive(filter);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 pt-6 pb-5 md:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <ColorDot color={project.color} className="h-3.5 w-3.5" />
          <h1 className="truncate text-[1.75rem] leading-tight font-semibold tracking-tight text-foreground">
            {project.name}
          </h1>
          <button
            aria-label={project.favorite ? "Remove from favorites" : "Add to favorites"}
            aria-pressed={project.favorite}
            onClick={() => actions.toggleFavorite(project.id)}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-foreground/8"
          >
            <Star
              className={cn(
                "h-6 w-6",
                project.favorite ? "fill-star text-star" : "text-muted-foreground",
              )}
              strokeWidth={1.6}
            />
          </button>
        </div>
        <div className="flex items-center gap-1 text-foreground sm:gap-2">
          <button
            aria-label="Manage project members"
            onClick={() => setShareOpen(true)}
            className="flex items-center gap-1 rounded-full p-1 hover:bg-foreground/8"
          >
            <AvatarStack users={members} max={3} size="h-7 w-7" />
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-tonal text-tonal-foreground">
              <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            </span>
          </button>
          <span aria-hidden className="mx-1 h-6 w-px bg-border" />
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="View"
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium hover:bg-foreground/8",
                view === "list" && "bg-primary-container text-on-primary-container",
              )}
            >
              {view === "board" ? (
                <Columns3 className="h-4 w-4" strokeWidth={1.6} />
              ) : (
                <List className="h-4 w-4" strokeWidth={1.6} />
              )}
              <span className="hidden sm:inline">View</span>
              <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.8} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup value={view} onValueChange={(v) => setView(v as "board" | "list")}>
                <DropdownMenuRadioItem value="board" className="gap-2">
                  <Columns3 className="h-4 w-4" strokeWidth={1.6} /> Board
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="list" className="gap-2">
                  <List className="h-4 w-4" strokeWidth={1.6} /> List
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <span aria-hidden className="mx-1 h-6 w-px bg-border" />
          <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
            <PopoverTrigger
              aria-label="Filters"
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium hover:bg-foreground/8",
                filterActive && "bg-primary-container text-on-primary-container",
              )}
            >
              <Filter className="h-4 w-4" strokeWidth={1.6} />
              <span className="hidden sm:inline">Filters</span>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-auto rounded-3xl p-0 shadow-panel outline-none"
              onOpenAutoFocus={(e) => {
                e.preventDefault();
                (e.currentTarget as HTMLElement | null)?.focus();
              }}
              tabIndex={-1}
            >
              <FiltersPanel
                filter={filter}
                onChange={setFilter}
                members={members}
                me={me}
                labels={state.labels}
              />
            </PopoverContent>
          </Popover>
          <span aria-hidden className="mx-1 h-6 w-px bg-border" />
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Group by"
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium hover:bg-foreground/8",
                groupBy !== "sections" && "bg-primary-container text-on-primary-container",
              )}
            >
              <Rows3 className="h-4 w-4" strokeWidth={1.6} />
              <span className="hidden sm:inline">Group By</span>
              <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.8} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuRadioGroup
                value={groupBy}
                onValueChange={(v) => setGroupBy(v as GroupBy)}
              >
                {GROUP_OPTIONS.map((o) => (
                  <DropdownMenuRadioItem key={o.value} value={o.value}>
                    {o.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <span aria-hidden className="mx-1 h-6 w-px bg-border" />
          <button
            aria-label="Toggle completed tasks"
            aria-pressed={showCompleted}
            onClick={() => setShowCompleted((v) => !v)}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium hover:bg-foreground/8",
              showCompleted && "text-link",
            )}
          >
            <CircleCheck className="h-4 w-4" strokeWidth={1.6} />
            <span className="hidden sm:inline">Completed Tasks</span>
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {view === "list" ? (
          <TaskList groups={listGroups} onOpenTask={setOpenTask} />
        ) : groupBy === "sections" ? (
          <Board
            projectId={project.id}
            sections={sections}
            tasksBySection={tasksBySection}
            onOpenTask={setOpenTask}
          />
        ) : (
          <GroupedBoard
            groups={groupTasks(visibleTasks, groupBy, {
              users: members,
              labels: state.labels,
              today: todayISO(),
              meId: state.currentUserId,
            })}
            onOpenTask={setOpenTask}
          />
        )}
      </div>

      <TaskDialog taskId={openTaskId ?? null} onClose={() => setOpenTask(null)} />

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          <DialogTitle>Members of "{project.name}"</DialogTitle>
          <p className="-mt-2 text-sm text-muted-foreground">
            Choose who can see and work on this project.
          </p>
          <MemberPicker
            users={state.users}
            selected={project.memberIds}
            onChange={(memberIds) => actions.updateProject(project.id, { memberIds })}
            lockedId={state.currentUserId}
          />
          <div className="flex justify-end">
            <Button onClick={() => setShareOpen(false)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

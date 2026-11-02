import type { ReactNode } from "react";
import type { Label, User } from "@/lib/types";
import type { TaskFilter } from "@/lib/task-utils";
import { emptyFilter, isFilterActive } from "@/lib/task-utils";
import { labelVar } from "@/lib/colors";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PRIORITY_OPTIONS: { value: TaskFilter["priority"]; label: string }[] = [
  { value: "all", label: "All" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
  { value: "none", label: "No priority" },
];

const DUE_OPTIONS: { value: TaskFilter["due"]; label: string }[] = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "upcoming", label: "Upcoming" },
  { value: "overdue", label: "Overdue" },
  { value: "none", label: "No due date" },
];

export function FiltersPanel({
  filter,
  onChange,
  members,
  me,
  labels,
}: {
  filter: TaskFilter;
  onChange: (f: TaskFilter) => void;
  members: User[];
  me?: User | undefined;
  labels: Label[];
}) {
  const others = members
    .filter((m) => m.id !== me?.id)
    .sort((a, b) => a.name.localeCompare(b.name));
  const sortedLabels = [...labels].sort((a, b) => a.name.localeCompare(b.name));
  const set = <K extends keyof TaskFilter>(key: K, value: TaskFilter[K]) =>
    onChange({ ...filter, [key]: value });

  return (
    <div className="w-[min(22rem,calc(100vw-2rem))] p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Filter</h2>
        {isFilterActive(filter) && (
          <button
            onClick={() => onChange(emptyFilter)}
            className="rounded-full px-2 py-1 text-sm font-medium text-link hover:bg-foreground/8"
          >
            Clear all
          </button>
        )}
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <label htmlFor="filter-keyword" className="text-[0.95rem] text-foreground">
            Keyword
          </label>
          <Input
            id="filter-keyword"
            type="search"
            value={filter.keyword}
            onChange={(e) => set("keyword", e.target.value)}
            placeholder="Search tasks"
            className="w-44 shrink-0 rounded-xl"
          />
        </div>
        <FilterRow label="Assigned" value={filter.assignee} onChange={(v) => set("assignee", v)}>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="me">Assigned to me</SelectItem>
          <SelectItem value="none">Unassigned</SelectItem>
          {others.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.name}
            </SelectItem>
          ))}
        </FilterRow>
        <FilterRow
          label="Priority"
          value={filter.priority}
          onChange={(v) => set("priority", v as TaskFilter["priority"])}
        >
          {PRIORITY_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </FilterRow>
        <FilterRow label="Labels" value={filter.label} onChange={(v) => set("label", v)}>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="none">No labels</SelectItem>
          {sortedLabels.map((l) => (
            <SelectItem key={l.id} value={l.id}>
              <span className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className="h-3 w-3 shrink-0 rounded-[3px]"
                  style={{ backgroundColor: labelVar(l.color) }}
                />
                {l.name}
              </span>
            </SelectItem>
          ))}
        </FilterRow>
        <FilterRow
          label="Due date"
          value={filter.due}
          onChange={(v) => set("due", v as TaskFilter["due"])}
        >
          {DUE_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </FilterRow>
      </div>
    </div>
  );
}

function FilterRow({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[0.95rem] text-foreground">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label} className="h-11 w-44 shrink-0 rounded-xl bg-card">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  );
}

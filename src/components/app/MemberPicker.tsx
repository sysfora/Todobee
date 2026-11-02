import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { User } from "@/lib/types";
import { UserAvatar } from "./primitives";

export function MemberPicker({
  users,
  selected,
  onChange,
  lockedId,
}: {
  users: User[];
  selected: string[];
  onChange: (ids: string[]) => void;
  /** A member that can't be removed (the current user) */
  lockedId?: string;
}) {
  const toggle = (id: string) => {
    if (id === lockedId) return;
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };
  return (
    <div>
      <div className="mb-2 flex items-center gap-3">
        <span className="text-sm font-medium text-foreground">Users ({selected.length})</span>
        <span className="text-xs text-foreground">
          <button
            type="button"
            className="hover:text-primary"
            onClick={() => onChange(users.map((u) => u.id))}
          >
            Select All
          </button>
          {" / "}
          <button
            type="button"
            className="hover:text-primary"
            onClick={() => onChange(lockedId ? [lockedId] : [])}
          >
            Deselect All
          </button>
        </span>
      </div>
      <div className="max-h-64 divide-y overflow-y-auto rounded-md border scrollbar-thin">
        {users.map((u) => {
          const on = selected.includes(u.id);
          return (
            <button
              type="button"
              key={u.id}
              onClick={() => toggle(u.id)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted"
            >
              <UserAvatar user={u} className="h-7 w-7 ring-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">{u.name}</span>
                <span className="block truncate text-sm text-muted-foreground">{u.email}</span>
              </span>
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full border",
                  on ? "border-primary bg-primary text-primary-foreground" : "border-input",
                )}
              >
                {on && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

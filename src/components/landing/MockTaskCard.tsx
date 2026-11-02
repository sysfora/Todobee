import { Calendar, CircleCheck, Circle, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Label, Priority, User } from "@/lib/types";
import { AvatarStack, LabelChip } from "@/components/app/primitives";

const priorityBorder: Record<Priority, string> = {
  high: "border-l-4 border-l-priority-high",
  medium: "border-l-4 border-l-priority-medium",
  low: "border-l-4 border-l-priority-low",
  none: "",
};

/** Static look-alike of a board task card, for illustrations only. */
export function MockTaskCard({
  title,
  labels = [],
  due,
  overdue,
  checklist,
  notes,
  people = [],
  priority = "none",
  done,
}: {
  title: string;
  labels?: Label[];
  due?: string;
  overdue?: boolean;
  checklist?: string;
  notes?: number;
  people?: User[];
  priority?: Priority;
  done?: boolean;
}) {
  return (
    <div className={cn("rounded-md bg-card px-3.5 py-3 shadow-raised", priorityBorder[priority])}>
      <div className="flex items-start gap-2.5">
        {done ? (
          <CircleCheck className="mt-px h-[1.125rem] w-[1.125rem] shrink-0 fill-check text-card" />
        ) : (
          <Circle
            className="mt-px h-[1.125rem] w-[1.125rem] shrink-0 text-subtle"
            strokeWidth={1.5}
          />
        )}
        <p
          className={cn(
            "text-sm leading-snug font-medium text-foreground",
            done && "font-normal text-muted-foreground line-through",
          )}
        >
          {title}
        </p>
      </div>
      {labels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5 pl-7">
          {labels.map((l) => (
            <LabelChip key={l.id} label={l} />
          ))}
        </div>
      )}
      {(due || checklist || notes || people.length > 0) && (
        <div className="mt-2.5 flex items-center gap-3 pl-7 text-xs text-muted-foreground">
          {due && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5",
                overdue ? "text-danger" : "text-link",
              )}
            >
              <Calendar className="h-3 w-3" strokeWidth={1.8} />
              {due}
            </span>
          )}
          {checklist && (
            <span className="inline-flex items-center gap-1">
              <CircleCheck className="h-3.5 w-3.5" strokeWidth={1.6} />
              {checklist}
            </span>
          )}
          {notes ? (
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.6} />
              {notes}
            </span>
          ) : null}
          <span className="flex-1" />
          <AvatarStack users={people} max={2} size="h-6 w-6" />
        </div>
      )}
    </div>
  );
}

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { labelVar, swatchVar, type Swatch } from "@/lib/colors";
import type { Label, User } from "@/lib/types";

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export function UserAvatar({
  user,
  className,
  decorative,
}: {
  user?: User | undefined;
  className?: string;
  decorative?: boolean;
}) {
  return (
    <Avatar className={cn("h-7 w-7 ring-2 ring-card", className)} title={user?.name}>
      {user?.avatar && <AvatarImage src={user.avatar} alt={decorative ? "" : user.name} />}
      <AvatarFallback className="bg-primary text-[0.6rem] font-semibold text-primary-foreground">
        {user ? initials(user.name) : "?"}
      </AvatarFallback>
    </Avatar>
  );
}

export function AvatarStack({
  users,
  max = 2,
  size = "h-6 w-6",
}: {
  users: User[];
  max?: number;
  size?: string;
}) {
  if (users.length === 0) return null;
  const shown = users.slice(0, max);
  const extra = users.length - shown.length;
  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {shown.map((u) => (
          <UserAvatar key={u.id} user={u} className={size} />
        ))}
      </div>
      {extra > 0 && <span className="ml-1 text-xs text-muted-foreground">+{extra}</span>}
    </div>
  );
}

export function ColorDot({ color, className }: { color: Swatch; className?: string }) {
  return (
    <span
      className={cn("inline-block h-2.5 w-2.5 shrink-0 rounded-full", className)}
      style={{ backgroundColor: swatchVar(color) }}
    />
  );
}

/** Solid label chip with white text; `pill` is the larger size used in panels and pickers. */
export function LabelChip({ label, pill }: { label: Label; pill?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium text-on-swatch",
        pill ? "rounded-lg px-3 py-1 text-sm" : "rounded px-1.5 py-0.5 text-[0.72rem]",
      )}
      style={{ backgroundColor: labelVar(label.color) }}
    >
      {label.name}
    </span>
  );
}

export function PageTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h1
      className={cn(
        "text-[1.75rem] leading-tight font-semibold tracking-tight text-foreground sm:text-[2rem]",
        className,
      )}
    >
      {children}
    </h1>
  );
}

/** Round icon-only action button with a comfortable tap target and visible focus ring. */
export const iconAction =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40";

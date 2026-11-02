import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

/** Google-style pill search field. */
export function SearchInput({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("relative w-full max-w-md", className)}>
      <Search className="absolute top-1/2 left-3.5 h-[1.125rem] w-[1.125rem] -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search"
        aria-label="Search"
        className="h-10 w-full rounded-full border border-transparent bg-tonal pr-4 pl-11 text-sm text-foreground transition outline-none placeholder:text-muted-foreground focus:border-border focus:bg-card focus:shadow-raised"
      />
    </div>
  );
}

"use client";
import { Link } from "@/lib/nav";
import { useMemo, useState } from "react";
import { ChevronsUpDown, Eye, Pencil, Star, Trash2 } from "lucide-react";
import { actions, useAppState } from "@/lib/store";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ColorDot, PageTitle, iconAction } from "@/components/app/primitives";
import { ProjectDialog } from "@/components/app/ProjectDialog";
import { ConfirmDialog } from "@/components/app/ConfirmDialog";
import { useShell } from "@/components/app/shell-context";
import { SearchInput } from "@/components/app/SearchInput";
import { isAdmin } from "@/lib/subscription";


export function ProjectsPage() {
  const { projects, users, currentUserId } = useAppState();
  const admin = isAdmin(users.find((u) => u.id === currentUserId));
  const { openCreateProject } = useShell();
  const [query, setQuery] = useState("");
  const [asc, setAsc] = useState<boolean | null>(null);
  const [editing, setEditing] = useState<Project | undefined>();
  const [deleting, setDeleting] = useState<Project | undefined>();

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = projects.filter((p) => p.name.toLowerCase().includes(q));
    if (asc === null) return list;
    return [...list].sort((a, b) => (asc ? 1 : -1) * a.name.localeCompare(b.name));
  }, [projects, query, asc]);

  return (
    <div className="space-y-6 px-4 py-6 md:px-8">
      <div className="flex flex-wrap items-center gap-4 lg:flex-nowrap">
        <PageTitle className="mr-auto">Projects</PageTitle>
        <SearchInput
          value={query}
          onChange={setQuery}
          className="order-last max-w-none lg:order-none lg:max-w-sm"
        />
        {admin && (
          <Button className="shrink-0" onClick={openCreateProject}>
            Create Project
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg bg-card shadow-card">
        <button
          onClick={() => setAsc((v) => (v === null ? true : !v))}
          aria-label={`Sort by name, ${asc === false ? "A to Z" : "Z to A"}`}
          className="flex w-full items-center gap-1 border-b bg-panel px-6 py-3.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase"
        >
          Name <ChevronsUpDown className="h-3.5 w-3.5" />
        </button>
        {rows.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">No projects found.</p>
        ) : (
          <ul className="divide-y">
            {rows.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 py-2.5 pr-3 pl-6 hover:bg-panel sm:pr-5"
              >
                <Link
                  to="/projects/$projectId"
                  params={{ projectId: p.id }}
                  className="flex min-w-0 flex-1 items-center gap-4 font-medium text-foreground hover:text-primary"
                >
                  <ColorDot color={p.color} className="h-2 w-2" />
                  <span className="truncate">{p.name}</span>
                </Link>
                <div className="flex items-center gap-1 text-muted-foreground sm:gap-2">
                  <Link
                    to="/projects/$projectId"
                    params={{ projectId: p.id }}
                    aria-label={`View ${p.name}`}
                    className={cn(iconAction, "hidden sm:inline-flex")}
                  >
                    <Eye className="h-5 w-5" strokeWidth={1.5} />
                  </Link>
                  <button
                    aria-label={
                      p.favorite ? `Remove ${p.name} from favorites` : `Add ${p.name} to favorites`
                    }
                    aria-pressed={p.favorite}
                    onClick={() => actions.toggleFavorite(p.id)}
                    className={iconAction}
                  >
                    <Star
                      className={cn("h-5 w-5", p.favorite && "fill-star text-star")}
                      strokeWidth={1.5}
                    />
                  </button>
                  {admin && (
                    <>
                      <button
                        aria-label={`Edit ${p.name}`}
                        onClick={() => setEditing(p)}
                        className={iconAction}
                      >
                        <Pencil className="h-5 w-5" strokeWidth={1.5} />
                      </button>
                      <button
                        aria-label={`Delete ${p.name}`}
                        onClick={() => setDeleting(p)}
                        className={cn(iconAction, "hover:text-danger")}
                      >
                        <Trash2 className="h-5 w-5" strokeWidth={1.5} />
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ProjectDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(undefined)}
        project={editing}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(undefined)}
        title="Delete project?"
        description={`"${deleting?.name}" and all of its tasks will be permanently removed.`}
        onConfirm={() => deleting && actions.deleteProject(deleting.id)}
      />
    </div>
  );
}

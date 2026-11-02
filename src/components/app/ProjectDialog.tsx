import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/nav";
import { Check } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SWATCHES, swatchVar, type Swatch } from "@/lib/colors";
import { actions, useAppState } from "@/lib/store";
import type { Project } from "@/lib/types";
import { MemberPicker } from "./MemberPicker";

export function ProjectDialog({
  open,
  onOpenChange,
  project,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | undefined;
}) {
  const { users, currentUserId } = useAppState();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [color, setColor] = useState<Swatch>("gray");
  const [members, setMembers] = useState<string[]>([currentUserId]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(project?.name ?? "");
    setColor(project?.color ?? "gray");
    setMembers(project?.memberIds ?? [currentUserId]);
    setError("");
  }, [open, project, currentUserId]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError("Please enter a project name.");
    if (project) {
      actions.updateProject(project.id, { name: trimmed, color, memberIds: members });
      onOpenChange(false);
    } else {
      const id = actions.createProject({ name: trimmed, color, memberIds: members });
      onOpenChange(false);
      navigate({ to: "/projects/$projectId", params: { projectId: id } });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-0 p-0 [&>button:last-child]:hidden">
        <form onSubmit={submit}>
          <div className="space-y-5 px-6 pt-6 pb-5">
            <DialogTitle className="text-lg font-semibold">
              {project ? "Edit Project" : "Create Project"}
            </DialogTitle>
            <div className="space-y-1.5">
              <label htmlFor="project-name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="project-name"
                autoFocus
                placeholder="Name"
                value={name}
                maxLength={80}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
              />
              {error && <p className="text-sm text-danger">{error}</p>}
            </div>
            <div className="space-y-1.5">
              <span className="text-sm font-medium">Color</span>
              <div className="flex flex-wrap gap-1">
                {SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={c}
                    onClick={() => setColor(c)}
                    className="flex h-6 w-6 items-center justify-center rounded text-on-swatch transition-transform hover:scale-110"
                    style={{ backgroundColor: swatchVar(c) }}
                  >
                    {color === c && <Check className="h-4 w-4" strokeWidth={3} />}
                  </button>
                ))}
              </div>
            </div>
            <MemberPicker
              users={users}
              selected={members}
              onChange={setMembers}
              lockedId={currentUserId}
            />
          </div>
          <div className="flex justify-end gap-2 rounded-b-3xl px-6 pt-2 pb-6">
            <Button
              type="button"
              variant="ghost"
              className="text-primary"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">{project ? "Save Changes" : "Create Project"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

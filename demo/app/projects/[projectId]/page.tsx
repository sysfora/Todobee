import type { Metadata } from "next";
import { WorkspaceFrame } from "@/components/app/WorkspaceFrame";
import { ProjectBoard } from "@/views/project-board";

export const metadata: Metadata = { title: "Project Board" };

export default function Page() {
  return (
    <WorkspaceFrame>
      <ProjectBoard />
    </WorkspaceFrame>
  );
}

import type { Metadata } from "next";
import { WorkspaceFrame } from "@/components/app/WorkspaceFrame";
import { ProjectsPage } from "@/views/projects";

export const metadata: Metadata = { title: "Projects" };

export default function Page() {
  return (
    <WorkspaceFrame>
      <ProjectsPage />
    </WorkspaceFrame>
  );
}

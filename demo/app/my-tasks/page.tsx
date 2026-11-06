import type { Metadata } from "next";
import { WorkspaceFrame } from "@/components/app/WorkspaceFrame";
import { MyTasks } from "@/views/my-tasks";

export const metadata: Metadata = { title: "My Tasks" };

export default function Page() {
  return (
    <WorkspaceFrame>
      <MyTasks />
    </WorkspaceFrame>
  );
}

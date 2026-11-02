import type { Metadata } from "next";
import { WorkspaceFrame } from "@/components/app/WorkspaceFrame";
import { Dashboard } from "@/views/dashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default function Page() {
  return (
    <WorkspaceFrame adminOnly>
      <Dashboard />
    </WorkspaceFrame>
  );
}

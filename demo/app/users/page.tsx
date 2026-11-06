import type { Metadata } from "next";
import { WorkspaceFrame } from "@/components/app/WorkspaceFrame";
import { UsersPage } from "@/views/users";

export const metadata: Metadata = { title: "Users" };

export default function Page() {
  return (
    <WorkspaceFrame adminOnly>
      <UsersPage />
    </WorkspaceFrame>
  );
}

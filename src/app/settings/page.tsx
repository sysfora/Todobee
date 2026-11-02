import type { Metadata } from "next";
import { WorkspaceFrame } from "@/components/app/WorkspaceFrame";
import { SettingsPage } from "@/views/settings";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return (
    <WorkspaceFrame>
      <SettingsPage />
    </WorkspaceFrame>
  );
}

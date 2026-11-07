import type { Metadata } from "next";
import { LandingPage } from "@/views/landing";
import { StructuredData } from "@/components/seo/StructuredData";

export const metadata: Metadata = {
  title: {
    absolute: "Todobee - The #1 Project Management Software For Google Workspace",
  },
  description:
    "Plan projects on clear boards, track tasks with checklists, notes and files, and keep your team's work in your own Google Drive.",
};

export default function Page() {
  return (
    <>
      <StructuredData />
      <LandingPage />
    </>
  );
}

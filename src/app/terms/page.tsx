import type { Metadata } from "next";
import { LegalPage } from "@/components/landing/LegalPage";

export const metadata: Metadata = { title: "Terms" };

export default function Page() {
  return (
    <LegalPage title="Terms">
      <p>
        Todobee is billed yearly per seat through Stripe. Projects, tasks, notes and files stay in
        the workspace admin's Google Drive. You can export a backup or cancel the Stripe
        subscription at any time.
      </p>
    </LegalPage>
  );
}

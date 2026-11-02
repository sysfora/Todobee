import type { Metadata } from "next";
import { LegalPage } from "@/components/landing/LegalPage";

export const metadata: Metadata = { title: "Privacy" };

export default function Page() {
  return (
    <LegalPage title="Privacy">
      <p>
        Todobee stores only your account, users and roles. Your projects, tasks, notes and files are
        kept in your workspace admin's Google Drive. PocketBase keeps a cache of that Drive file so
        the boards stay fast, and Stripe stores the card and subscription for billing.
      </p>
    </LegalPage>
  );
}

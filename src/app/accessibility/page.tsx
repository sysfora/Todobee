import type { Metadata } from "next";
import { LegalPage } from "@/components/landing/LegalPage";

export const metadata: Metadata = { title: "Accessibility" };

export default function Page() {
  return (
    <LegalPage title="Accessibility">
      <p>
        We aim for Todobee to meet WCAG 2.1 AA. If something is hard to use, please let us know.
      </p>
    </LegalPage>
  );
}

import type { Metadata } from "next";
import { LegalPage } from "@/components/landing/LegalPage";
import { LegalMarkdown } from "@/components/landing/LegalMarkdown";

export const metadata: Metadata = { title: "Accessibility" };

const SOURCE = "# Accessibility Statement\n\nAt Sysfora Technologies Private Limited (\"Sysfora\"), we are committed to delivering a digital experience that is inclusive, accessible, and empowering for all users regardless of ability, location, or device. Accessibility is a foundational part of our product design, development, and content localization strategies.\n\nWe believe that everyone should have equal access to online tools, and our mission is to build digital infrastructure that reflects that principle.\n\n# **Our accessibility commitment**\n\nSysfora strives to conform to the **Web Content Accessibility Guidelines (WCAG) 2.2 Level AA**, the international standard for digital accessibility, and we are actively working to improve accessibility and address any accessibility issues.\n\n# **Accessibility progress and ongoing improvements**\n\nAccessibility at Sysfora is a continuous commitment guided by both international standards and regulatory requirements. As part of our efforts, we regularly conduct **automated accessibility audits** using WCAG validation utilities. We are committed to continually enhancing accessibility to ensure an inclusive experience for all clients, regardless of ability or location.\n\n# **Feedback and support**\n\nIf you encounter an accessibility barrier or have suggestions for improvement, please contact us:\n\nEmail:  contact@sysfora.com\n\nWe aim to respond within 5 business days and address concerns as promptly as possible.";

export default function Page() {
  return (
    <LegalPage title="Accessibility">
      <LegalMarkdown source={SOURCE} />
    </LegalPage>
  );
}

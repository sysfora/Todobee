import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Security",
  description:
    "How Todobee protects your data, with GDPR, HIPAA and CCPA privacy commitments.",
};

export default function SecurityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}


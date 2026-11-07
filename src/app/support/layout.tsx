import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support",
  description:
    "Get help with Todobee. Contact our support team for questions about Google Workspace integration, boards, features, and account billing.",
};

export default function SupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}


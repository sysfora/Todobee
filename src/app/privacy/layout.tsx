import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "How Todobee collects, uses, and shares personal information.",
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

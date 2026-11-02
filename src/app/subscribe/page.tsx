import type { Metadata } from "next";
import { SubscribePage } from "@/views/subscribe";

export const metadata: Metadata = { title: "Choose your plan", robots: { index: false } };

export default function Page() {
  return <SubscribePage />;
}

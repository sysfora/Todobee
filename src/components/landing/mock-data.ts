import type { Label, User } from "@/lib/types";

/** Sample people and labels used only in the landing page illustrations. */
const person = (id: string, name: string): User => ({
  id,
  name,
  email: `${id}@example.com`,
  role: "Member",
});

export const DEMO_USERS = {
  maya: person("maya", "Maya Khan"),
  arun: person("arun", "Arun Shah"),
  nina: person("nina", "Nina Kovacs"),
};

export const DEMO_LABELS = {
  feature: { id: "feature", name: "Feature", color: "violet" },
  design: { id: "design", name: "Design", color: "red" },
  marketing: { id: "marketing", name: "Marketing", color: "amber" },
  research: { id: "research", name: "Research", color: "green" },
  urgent: { id: "urgent", name: "Urgent", color: "pink" },
  improvement: { id: "improvement", name: "Improvement", color: "sky" },
} satisfies Record<string, Label>;

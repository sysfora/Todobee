import { Eye, Github, Unlock, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export const GITHUB_URL = "https://github.com/Sysfora/Todobee.git";

const POINTS = [
  {
    icon: Eye,
    title: "Fully transparent",
    text: "Read every line of code, check how your data is handled. All code is licensed under AGPL-3.0.",
  },
  {
    icon: Users,
    title: "Community driven",
    text: "Shaped by ideas, feedback and contributions from teams who use Todobee everyday.",
  },
  {
    icon: Unlock,
    title: "Zero lock-in",
    text: "Your projects live in your own Google Drive. You're always free to take them with you.",
  },
];

export function OpenSourceSection() {
  return (
    <section
      id="open-source"
      aria-labelledby="open-source-title"
      className="scroll-mt-20 px-4 py-20 sm:py-24"
    >
      <div className="mx-auto max-w-5xl px-6 py-14 text-center sm:px-12">
        <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          <Github className="h-4 w-4" aria-hidden />
          100% Open Source
        </span>
        <h2
          id="open-source-title"
          className="mx-auto mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl"
        >
          Built with the community, for the community
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Todobee is fully open source. We believe productivity tools your team relies on every day should be
          open, honest and transparent.
        </p>

        <ul className="mt-12 grid gap-4 text-left sm:grid-cols-3">
          {POINTS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="rounded-2xl border border-border p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-4 text-lg font-medium text-foreground">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ size: "lg" }), "gap-2")}
          >
            <Github className="h-4 w-4" aria-hidden />
            View on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}

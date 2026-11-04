"use client";

import { useResumeSignIn } from "@/hooks/use-google-sign-in";
import { SignInButton } from "@/components/landing/SignInButton";
import { useEffect, type ReactNode } from "react";
import { toast } from "sonner";
import { applyTheme } from "@/lib/theme";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { BeeLogo, HELP_EMAIL, LandingFooter, LandingNav } from "@/components/landing/LandingChrome";
import boardShot from "@/assets/todobee-marketing-board.webp.asset.json";
import { PricingSection } from "@/components/landing/PricingSection";
import { OpenSourceSection } from "@/components/landing/OpenSourceSection";
import { AccessVisual, BoardVisual, DriveVisual, TaskVisual } from "@/components/landing/visuals";

const PAGE_URL = "https://todobeenew.lovable.app/";
const TITLE = "Todobee - The #1 Project Management Software For Google Workspace";
const DESCRIPTION =
  "Plan projects on clear boards, track tasks with checklists, notes and files, and keep your team's work in your own Google Drive.";


const FEATURES: {
  title: string;
  body: string;
  points: string[];
  visual: ReactNode;
}[] = [
  {
    title: "All your projects in their own clear boards",
    body: "Each project is a board of sections your team can see at a glance. Move work forward by dragging cards from one column to the next.",
    points: [
      "Drag tasks between sections",
      "Group the board by person, label, priority or due date",
      "Filter down to just the tasks that matter right now",
    ],
    visual: <BoardVisual />,
  },
  {
    title: "Everything a task needs in one place",
    body: "Open any task to see the full picture: what needs doing, who is on it and when it's due.",
    points: [
      "Checklists, notes and attached files on every task",
      "Priorities, due dates, assignees and colored labels",
      "Notes keep the conversation next to the work",
    ],
    visual: <TaskVisual />,
  },
  {
    title: "Your work stays in your Google Drive",
    body: "Todobee is built for Google Workspace. Projects, tasks, notes, checklists and files are kept in the workspace admin's Google Drive.",
    points: [
      "Only users and roles are stored on Todobee",
      "Everything is saved to your own Google Drive",
      "Back up and restore your workspace in one click",
    ],
    visual: <DriveVisual />,
  },
  {
    title: "Bring your whole team along",
    body: "Invite people by email and add them to the projects they work on. Users only see the projects they're part of, so every board stays focused.",
    points: [
      "Admins manage users, projects and the subscription",
      "Users get full rights on the projects they're added to",
      "Click the avatars on any project to manage who's in",
    ],
    visual: <AccessVisual />,
  },
];

const FAQS = [
  {
    q: "What is Todobee?",
    a: "Todobee is a project management app for teams on Google Workspace.",
  },
  {
    q: "Where is my data stored?",
    a: "Projects, tasks, notes, checklists, due dates, files and project access are kept in the workspace admin's Google Drive. Todobee only stores your users and their roles.",
  },
  {
    q: "Who can see which projects?",
    a: "Admins can see and manage everything, including the subscription. Users have full access only to the projects they've been added to.",
  },
  {
    q: "How much does Todobee cost?",
    a: "Premium is $7.99, Pro is $14.99 and Enterprise is $79.99 per seat per month, billed annually.",
  },
  {
    q: "How many seats can I have?",
    a: "Every plan starts at 10 seats. Premium and Pro go up to 150 seats, and Enterprise has no seat limit.",
  },
  {
    q: "Is there a dark mode?",
    a: "Yes. Dark mode is available on the Pro and Enterprise plans. You can turn it on in Settings → Themes.",
  },
];

export function LandingPage() {
  // The landing page is always light, whatever theme someone picked inside the app;
  // leaving it puts the user's own theme back.
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    const err = new URLSearchParams(window.location.search).get("auth_error");
    if (err) {
      let desc = "Please try again.";
      if (err === "access_denied") {
        desc = "Google access was denied. If your Google OAuth app is in 'Testing' mode, add your email to 'Test users' in Google Cloud Console.";
      } else if (err.includes("redirect_uri_mismatch")) {
        desc = "Redirect URI mismatch. In Google Cloud Console, ensure 'http://localhost:3000/api/auth/google/callback' is in Authorized redirect URIs.";
      } else if (err === "invalid_state") {
        desc = "Your login session expired or state token was invalid. Please try clicking sign in again.";
      } else {
        desc = `Google sign-in error: ${decodeURIComponent(err)}`;
      }
      toast.error("We couldn't sign you in with Google", { description: desc, duration: 8000 });
    }
    return () => applyTheme();
  }, []);
  useResumeSignIn();

  return (
    <div id="top" className="min-h-dvh bg-surface text-foreground">
      <LandingNav />
      <main>
        {/* Hero */}
        <section className="px-4 pt-16 pb-14 text-center sm:pt-24">
          <BeeLogo className="mx-auto h-20 sm:h-24" />
          <h1 className="mt-6 text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
            Todobee
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-xl text-foreground sm:text-[1.75rem] sm:leading-snug">
            The open-source project management app for teams on Google Workspace
          </p>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
            Plan projects, track every task and keep your team in sync, with your work kept in your
            own Google Drive.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <SignInButton className={cn(buttonVariants({ size: "lg" }), "gap-3 pl-1.5 pr-6")}>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-background">
                <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
                  <path
                    fill="#FFC107"
                    d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
                  />
                  <path
                    fill="#FF3D00"
                    d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
                  />
                  <path
                    fill="#4CAF50"
                    d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
                  />
                  <path
                    fill="#1976D2"
                    d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
                  />
                </svg>
              </span>
              Get started with Google
            </SignInButton>
            <a
              href="#demo"
              className={cn(buttonVariants({ size: "lg", variant: "outline" }), "px-6")}
            >
              Live demo (No signup)
            </a>
          </div>
        </section>

        <section id="demo" aria-label="Example board" className="scroll-mt-24 px-4 pb-20 sm:px-6">
          <img
            src={boardShot.url}
            alt="Todobee Marketing Campaign project board with Todo, Review, Done and Ideas sections"
            width={2880}
            height={1800}
            className="mx-auto w-full max-w-6xl rounded-2xl border border-border shadow-xl"
          />
          <p className="mt-10 text-center text-lg text-muted-foreground">
            Made for teams that already work in Gmail, Drive, Calendar, Docs and Sheets
          </p>
        </section>

        {/* Features */}
        <div id="features" className="scroll-mt-20">
          {FEATURES.map((f, i) => (
            <FeatureRow key={f.title} {...f} reverse={i % 2 === 1} />
          ))}
        </div>

        <PricingSection />

        <OpenSourceSection />

        {/* FAQ */}
        <section id="faq" aria-labelledby="faq-title" className="scroll-mt-20 px-4 py-20 sm:py-24">
          <div className="mx-auto max-w-3xl">
            <h2
              id="faq-title"
              className="text-center text-4xl font-semibold tracking-tight text-foreground sm:text-5xl"
            >
              Frequently Asked Questions
            </h2>
            <Accordion type="single" collapsible className="mt-12">
              {FAQS.map((f) => (
                <AccordionItem key={f.q} value={f.q}>
                  <AccordionTrigger className="py-6 text-lg font-medium text-foreground hover:no-underline sm:text-xl">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="pb-6 text-base leading-relaxed text-muted-foreground">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            <p className="mt-8 text-center text-muted-foreground">
              Still have a question?{" "}
              <a
                href={`mailto:${HELP_EMAIL}?subject=Support%20Ticket`}
                className="font-medium text-link hover:underline"
              >
                Email us
              </a>
            </p>
          </div>
        </section>

        {/* Closing call to action */}
        <section className="px-4 py-20 text-center sm:py-28">
          <p className="text-sm font-medium tracking-[0.15em] text-link uppercase">
            Built for Google Workspace
          </p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Get started with Todobee
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Set up your workspace, invite your team and create your first project board in minutes.
          </p>
          <SignInButton className={cn(buttonVariants({ size: "lg" }), "mt-8")}>
            Get started <ArrowRight />
          </SignInButton>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}

function FeatureRow({
  title,
  body,
  points,
  visual,
  reverse,
}: {
  title: string;
  body: string;
  points: string[];
  visual: ReactNode;
  reverse: boolean;
}) {
  return (
    <section className="px-4 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2 md:gap-16">
        <div className={cn(reverse && "md:order-2")}>{visual}</div>
        <div>
          <h2 className="text-3xl leading-tight font-semibold tracking-tight text-foreground sm:text-[2.5rem]">
            {title}
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{body}</p>
          <ul className="mt-6 space-y-3">
            {points.map((p) => (
              <li key={p} className="flex items-start gap-3 text-muted-foreground">
                <Check className="mt-1 h-4 w-4 shrink-0 text-link" strokeWidth={2.2} />
                {p}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <SignInButton className={buttonVariants()}>Get started</SignInButton>
            <a
              href="#pricing"
              className="inline-flex items-center gap-1.5 font-medium text-link hover:underline"
            >
              See pricing <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

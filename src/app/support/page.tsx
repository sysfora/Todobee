"use client";

import { useState, useEffect, type FormEvent } from "react";
import { toast } from "sonner";
import {
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  HelpCircle,
  Code2,
  ArrowRight,
  Clock,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LandingNav, LandingFooter } from "@/components/landing/LandingChrome";
import { applyTheme } from "@/lib/theme";

export default function SupportPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.remove("dark");
    return () => applyTheme();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg("Please enter your name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    if (!subject.trim()) {
      setErrorMsg("Please enter a subject.");
      return;
    }
    if (!message.trim() || message.trim().length < 5) {
      setErrorMsg("Please enter a message (at least 5 characters).");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        const err = data.error || "Failed to send support message. Please try again or email us directly.";
        setErrorMsg(err);
        toast.error("Could not send support email", { description: err });
        return;
      }

      setSubmitted(true);
      toast.success("Support ticket sent", {
        description: "Your message has been delivered to our team at contact@sysfora.com.",
      });
    } catch {
      const err = "Network error while connecting to the support server. Please try again.";
      setErrorMsg(err);
      toast.error("Submission failed", { description: err });
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setName("");
    setEmail("");
    setSubject("");
    setMessage("");
    setSubmitted(false);
    setErrorMsg(null);
  }

  return (
    <div id="top" className="min-h-dvh bg-surface text-foreground">
      <LandingNav />
      <main>
        {/* Header Hero */}
        <section className="px-4 pt-16 pb-12 text-center sm:px-6 sm:pt-20 sm:pb-14">
          <p className="text-sm font-semibold tracking-widest text-primary uppercase">Support</p>
          <h1 className="mx-auto mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">
            How can we help?
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Have questions about Todobee, Google Workspace integration, billing, or technical setup?
            Send us a message and our support team will get right back to you.
          </p>
        </section>

        {/* Content Container */}
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24">
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-border p-5 sm:p-8">
                {submitted ? (
                  <div className="py-8 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <h2 className="mt-5 text-2xl font-semibold text-foreground">
                      Message Sent Successfully
                    </h2>
                    <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                      Thank you for contacting us! Your message has been sent to our team at{" "}
                      <span className="font-medium text-foreground">contact@sysfora.com</span>. We
                      typically reply within 24 hours on business days.
                    </p>
                    <div className="mt-8">
                      <button
                        type="button"
                        onClick={handleReset}
                        className={cn(buttonVariants({ variant: "outline", size: "default" }), "shadow-none hover:shadow-none")}
                      >
                        Send another message
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} noValidate>
                    <div className="border-b border-border pb-5">
                      <h2 className="text-xl font-semibold text-foreground">Send a support ticket</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Fill out the details below and we&apos;ll deliver your inquiry directly to our
                        support team.
                      </p>
                    </div>

                    {errorMsg && (
                      <div className="mt-5 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <p>{errorMsg}</p>
                      </div>
                    )}

                    <div className="mt-6 space-y-5">
                      <div>
                        <Label htmlFor="name" className="text-sm font-medium text-foreground">
                          Full Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="name"
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Jane Doe"
                          className="mt-2"
                          disabled={loading}
                        />
                      </div>

                      <div>
                        <Label htmlFor="email" className="text-sm font-medium text-foreground">
                          Email Address <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="jane@company.com"
                          className="mt-2"
                          disabled={loading}
                        />
                      </div>

                      <div>
                        <Label htmlFor="subject" className="text-sm font-medium text-foreground">
                          Subject <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="subject"
                          type="text"
                          required
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          placeholder="e.g. Google Drive sync setup, plan upgrade question"
                          className="mt-2"
                          disabled={loading}
                        />
                      </div>

                      <div>
                        <Label htmlFor="message" className="text-sm font-medium text-foreground">
                          Message <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                          id="message"
                          required
                          rows={5}
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Tell us what you're experiencing or ask any questions..."
                          className="mt-2 min-h-[140px]"
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div className="mt-8">
                      <button
                        type="submit"
                        disabled={loading}
                        className={cn(buttonVariants({ size: "lg" }), "w-full gap-2 px-8 shadow-none hover:shadow-none sm:w-auto")}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            Send Message
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Support Info Sidebar Column */}
            <div className="space-y-6 lg:col-span-5">
              <div className="rounded-2xl border border-border p-5 sm:p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Mail className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">Direct Email</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Prefer sending an email directly from your own mail client?
                </p>
                <div className="mt-4 rounded-xl border border-border bg-background p-3.5">
                  <a
                    href="mailto:contact@sysfora.com"
                    className="font-medium text-link hover:underline break-all text-sm"
                  >
                    contact@sysfora.com
                  </a>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 text-link" />
                  <span>Responses within 24 hours (Monday – Friday)</span>
                </div>
              </div>

              {/* Security & FAQ links */}
              <div className="space-y-5 rounded-2xl border border-border p-5 sm:p-6">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <ShieldCheck className="h-4 w-4" />
                    </span>
                    <h3 className="text-base font-semibold text-foreground">Security & Privacy</h3>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Learn how your data is saved strictly to your Google Drive under GDPR and HIPAA commitments.
                  </p>
                  <a
                    href="/security"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-link hover:underline"
                  >
                    Explore Security <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </div>

                <hr className="border-border" />

                <div>
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <HelpCircle className="h-4 w-4" />
                    </span>
                    <h3 className="text-base font-semibold text-foreground">Frequently Asked Questions</h3>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Find quick answers to seat limits, pricing tiers, and Google OAuth setup.
                  </p>
                  <a
                    href="/#faq"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-link hover:underline"
                  >
                    View FAQ <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </div>

                <hr className="border-border" />

                <div>
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Code2 className="h-4 w-4" />
                    </span>
                    <h3 className="text-base font-semibold text-foreground">Open Source Community</h3>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Report issues, contribute code, or review the AGPL-3.0 codebase on GitHub.
                  </p>
                  <a
                    href="https://github.com/Sysfora/todobee/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-link hover:underline"
                  >
                    GitHub Issues <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}


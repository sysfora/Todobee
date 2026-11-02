import { SignInButton } from "./SignInButton";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLANS } from "@/lib/subscription";
import { buttonVariants } from "@/components/ui/button";

/** Plan prices come straight from the same plan list the Subscriptions settings use. */
export function PricingSection() {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-title"
      className="scroll-mt-20 px-4 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-sm font-medium tracking-[0.15em] text-link uppercase">Pricing</p>
          <h2
            id="pricing-title"
            className="mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl"
          >
            Choose your plan
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Priced per seat, billed annually, minimum&nbsp;10 seats.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const featured = plan.id === "pro";
            const [whole, cents] = plan.pricePerSeat.toFixed(2).split(".");
            return (
              <article
                key={plan.id}
                aria-labelledby={`plan-${plan.id}`}
                className={cn(
                  "relative flex flex-col rounded-3xl border bg-card p-7 sm:p-8",
                  featured ? "border-2 border-primary shadow-panel" : "border-border",
                )}
              >
                {featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                    Recommended
                  </span>
                )}
                <h3 id={`plan-${plan.id}`} className="text-2xl font-semibold text-foreground">
                  {plan.name}
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{plan.tagline}</p>
                <p className="mt-6 flex items-baseline text-foreground">
                  <span className="text-5xl font-semibold tracking-tight">${whole}</span>
                  <span className="text-xl font-medium">.{cents}</span>
                  <span className="ml-1.5 text-base text-muted-foreground">/ seat / mo</span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">per month, billed annually</p>
                <SignInButton
                  className={cn(
                    buttonVariants({ variant: featured ? "default" : "outline", size: "lg" }),
                    "mt-6 w-full",
                  )}
                >
                  Get started
                </SignInButton>
                <hr className="my-6" />
                {plan.inherits && (
                  <p className="mb-3 text-sm font-semibold text-foreground">{plan.inherits}</p>
                )}
                <ul className="space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-link" strokeWidth={2.2} />
                      {f}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

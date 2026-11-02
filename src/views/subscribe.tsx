"use client";
import { useNavigate } from "@/lib/nav";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, LogOut, Mail, RefreshCw } from "lucide-react";
import beeLight from "@/assets/todobee-bee-light.png.asset.json";
import { accountQuery, startCheckout, subscribeStep, type Account } from "@/lib/account";
import {
  clampSeats,
  defaultRenewal,
  formatRenewal,
  getPlan,
  MIN_SEATS,
  money,
  planMaxSeats,
  seatChangeError,
  yearlyTotal,
  type PlanId,
} from "@/lib/subscription";
import { useSignOut } from "@/hooks/use-sign-out";
import { Button, buttonVariants } from "@/components/ui/button";
import { PlanCards, SeatPicker } from "@/components/app/PlanPicker";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { User } from "@/lib/types";

import { PageTitle, UserAvatar } from "@/components/app/primitives";
import { cn } from "@/lib/utils";


export function SubscribePage() {
  const navigate = useNavigate();
  const { data: account, isLoading, isError } = useQuery({ ...accountQuery, retry: false });
  const signOut = useSignOut();
  useEffect(() => {
    if (isError) navigate({ to: "/", replace: true });
    else if (account && subscribeStep(account) === "app") {
      navigate({ to: account.role === "admin" ? "/dashboard" : "/projects", replace: true });
    }
  }, [account, isError, navigate]);
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);
  if (isLoading || !account) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const me = { name: account.name, avatar: account.avatarUrl ?? undefined } as User;

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-background">
      <header className="flex h-16 shrink-0 items-center justify-between gap-2 bg-background pr-3 pl-4 md:pr-4">
        <div className="flex items-center gap-2 px-2">
          <img src={beeLight.url} alt="" className="h-8 w-auto" />
          <span className="text-[1.375rem] font-semibold tracking-tight text-foreground max-[359px]:sr-only">
            Todobee
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Account: ${account.name}`}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:ring-4 hover:ring-foreground/8 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <UserAvatar user={me} decorative className="h-9 w-9 ring-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 rounded-3xl">
            <DropdownMenuLabel className="flex flex-col items-center gap-2 px-4 pt-3 pb-4 text-center">
              <UserAvatar user={me} decorative className="h-16 w-16 ring-0 [&_span]:text-lg" />
              <span className="text-base font-medium">Hi, {account.name.split(" ")[0]}!</span>
              <span className="text-xs font-normal text-muted-foreground">{account.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void signOut()}>
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <main className="min-h-0 min-w-0 flex-1 overflow-auto rounded-t-3xl bg-surface scrollbar-thin md:mx-4 md:mb-4 md:rounded-3xl">
        <div className="mx-auto max-w-6xl px-4 pt-2 pb-10 sm:px-6 md:px-8">
          {subscribeStep(account) === "choose-plan" ? (
            <ChoosePlan account={account} />
          ) : (
            <WaitForAdmin account={account} />
          )}
        </div>
      </main>
    </div>
  );
}

function ChoosePlan({ account }: { account: Account }) {
  const [plan, setPlan] = useState<PlanId>(
    account.workspace.plan === "enterprise" ? "premium" : account.workspace.plan,
  );
  const [seats, setSeats] = useState(Math.max(MIN_SEATS, account.workspace.seats));
  const [saving, setSaving] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  const choosePlan = (p: PlanId) => {
    setPlan(p);
    setSeats((s) => clampSeats(s, p));
  };

  const enterprise = plan === "enterprise";
  const error = seatChangeError(seats, 1, plan);
  const maxSeats = planMaxSeats(plan);
  const total = yearlyTotal(plan, seats);
  const renewal = formatRenewal(defaultRenewal());

  const subscribe = async () => {
    setSaving(true);
    try {
      await startCheckout(plan, seats);
    } catch (e) {
      toast.error("We couldn't start your subscription", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="pt-4 text-center sm:pt-8">
        <PageTitle>Choose a plan</PageTitle>
        <p className="mx-auto mt-2 max-w-2xl text-muted-foreground">
          Pick a plan and how many seats you need. All plans are billed yearly.
        </p>

      </div>

      <section className="rounded-2xl bg-card p-5 shadow-card sm:p-6">
        <h2 className="mb-4 text-lg font-medium text-foreground">Plan</h2>
        <PlanCards value={plan} onChange={choosePlan} />
      </section>

      {enterprise ? (
        <section className="rounded-2xl bg-card p-5 shadow-card sm:p-6">
          <h2 className="text-lg font-medium text-foreground">
            Enterprise is set up with our team
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            We'll set up your Shared Drive, multiple admins and onboarding with you. Email us and
            we'll get back to you, or choose Premium or Pro to start now.
          </p>
        </section>
      ) : (
        <section className="rounded-2xl bg-card p-5 shadow-card sm:p-6">
          <h2 className="text-lg font-medium text-foreground">Seats</h2>
          <p className="mt-1 mb-5 text-sm text-muted-foreground">
            {maxSeats
              ? `Between ${MIN_SEATS} and ${maxSeats} seats. You can add more later.`
              : `At least ${MIN_SEATS} seats, no upper limit.`}
          </p>
          <SeatPicker seats={seats} onChange={setSeats} plan={plan} />
          {error && (
            <p role="alert" className="mt-4 text-sm text-danger">
              {error}
            </p>
          )}
        </section>
      )}

      <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-card p-5 shadow-card sm:p-6">

        {enterprise ? (
          <>
            <p className="text-sm text-muted-foreground">
              {getPlan(plan).name} · {money(getPlan(plan).pricePerSeat)} per seat per month, billed
              yearly
            </p>
            <a
              href={`mailto:help@todobee.com?subject=${encodeURIComponent("Enterprise Plan")}`}
              className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}
            >
              <Mail /> Contact us
            </a>
          </>
        ) : (
          <>
            <div>
              <p className="text-sm text-muted-foreground">
                {getPlan(plan).name} · {seats} seats × {money(getPlan(plan).pricePerSeat)} / month
              </p>
              <p className="text-2xl font-semibold text-foreground">
                {money(total)}{" "}
                <span className="text-sm font-normal text-muted-foreground">/ year</span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">Renews {renewal}</p>
            </div>
            <Button
              size="lg"
              onClick={() => setPayOpen(true)}
              disabled={saving || !!error}
              className="w-full sm:w-auto"
            >
              {saving && <Loader2 className="animate-spin" />}
              Start subscription
            </Button>
          </>
        )}
      </div>

      {!enterprise && (
        <Dialog open={payOpen} onOpenChange={setPayOpen}>
          <DialogContent className="max-w-xl gap-0 p-0 [&>button:last-child]:hidden">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (saving) return;
                void subscribe();
              }}
            >
              <div className="space-y-5 px-6 pt-6 pb-5">
                <DialogTitle className="text-lg font-semibold">Payment details</DialogTitle>
                <div className="rounded-2xl bg-muted/50 p-4">
                  <p className="text-sm text-muted-foreground">
                    {getPlan(plan).name} · {seats} seats × {money(getPlan(plan).pricePerSeat)} /
                    month, billed yearly
                  </p>
                  <p className="mt-1 text-lg font-medium text-foreground">
                    {money(total)} due today{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      · renews {renewal}
                    </span>
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Card details are entered on Stripe's secure checkout. You'll come back here once
                  the yearly subscription is active.
                </p>
              </div>
              <div className="flex justify-end gap-2 rounded-b-3xl px-6 pt-2 pb-6">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-primary"
                  onClick={() => setPayOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="animate-spin" />}
                  Continue to Stripe
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}

function WaitForAdmin({ account }: { account: Account }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  const checkAgain = async () => {
    setChecking(true);
    const fresh = await queryClient.fetchQuery({ ...accountQuery, staleTime: 0 });
    setChecking(false);
    if (subscribeStep(fresh) === "app") await navigate({ to: "/dashboard", replace: true });
    else toast("Your workspace doesn't have a plan yet");
  };

  return (
    <div className="mx-auto max-w-lg pt-10 sm:pt-20">
      <div className="rounded-2xl bg-card px-6 py-10 text-center shadow-card sm:px-10">
        <h1 className="text-2xl font-normal text-foreground">Your workspace isn't ready yet</h1>
        <p className="mt-3 text-muted-foreground">
          {account.adminName ?? "Your admin"} needs to choose a plan for {account.workspace.name}.
          Once they do, you can start using Todobee.
        </p>
        <Button variant="outline" onClick={checkAgain} disabled={checking} className="mt-8">
          {checking ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          Check again
        </Button>
      </div>
    </div>
  );
}

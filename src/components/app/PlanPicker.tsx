import { useId, type ReactNode } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { clampSeats, MIN_SEATS, money, PLANS, planMaxSeats, type PlanId } from "@/lib/subscription";
import { cn } from "@/lib/utils";

/** The three plans as selectable cards (shared by sign-up and Settings → Subscriptions). */
export function PlanCards({
  value,
  onChange,
  currentPlan,
  label = "Plan",
}: {
  value: PlanId;
  onChange: (plan: PlanId) => void;
  /** Marks the plan the workspace is on now. */
  currentPlan?: PlanId | undefined;
  label?: string;
}) {
  const id = useId();
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-4 lg:grid-cols-3">
      {PLANS.map((p) => {
        const active = value === p.id;
        return (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-labelledby={`${id}-${p.id}`}
            aria-describedby={`${id}-${p.id}-details`}
            onClick={() => onChange(p.id)}
            className={cn(
              "flex flex-col rounded-lg border-2 p-5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              active ? "border-primary bg-primary/5" : "border-border hover:border-input",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span id={`${id}-${p.id}`} className="text-lg font-semibold text-foreground">
                {p.name}
              </span>
              {currentPlan === p.id ? (
                <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                  Current
                </span>
              ) : (
                <span
                  aria-hidden
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full border-2",
                    active ? "border-primary bg-primary text-primary-foreground" : "border-input",
                  )}
                >
                  {active && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
              )}
            </div>
            <div id={`${id}-${p.id}-details`}>
              <p className="mt-1 text-sm text-muted-foreground">{p.tagline}</p>
              <p className="mt-4">
                <span className="text-3xl font-semibold text-foreground">
                  {money(p.pricePerSeat)}
                </span>
                <span className="text-sm text-muted-foreground"> / seat / month</span>
              </p>
              <p className="text-xs text-muted-foreground">billed annually</p>
              <ul className="mt-4 space-y-1.5 text-sm">
                {p.inherits && <li className="font-medium text-foreground">{p.inherits}</li>}
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2 text-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Stepper control that stays inactive without the disabled attribute.
 * Safari selects the text in the neighboring number field when a disabled button is clicked.
 */
function SeatStep({
  label,
  blocked,
  onStep,
  children,
}: {
  label: string;
  blocked: boolean;
  onStep: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={label}
      aria-disabled={blocked}
      tabIndex={blocked ? -1 : undefined}
      className={blocked ? "cursor-not-allowed opacity-50 hover:bg-transparent" : undefined}
      onMouseDown={(event) => {
        if (blocked) event.preventDefault();
      }}
      onClick={() => {
        if (!blocked) onStep();
      }}
    >
      {children}
    </Button>
  );
}

/** Seat count with +/- buttons, a number field and (when the plan has a limit) a slider. */
export function SeatPicker({
  seats,
  onChange,
  plan,
}: {
  seats: number;
  onChange: (seats: number) => void;
  plan: PlanId;
}) {
  const maxSeats = planMaxSeats(plan);
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
      <div className="flex items-center gap-3">
        <SeatStep
          label="Remove a seat"
          blocked={seats <= MIN_SEATS}
          onStep={() => onChange(clampSeats(seats - 1, plan))}
        >
          <Minus className="h-4 w-4" />
        </SeatStep>
        <Input
          aria-label="Seats"
          type="number"
          min={MIN_SEATS}
          max={maxSeats ?? undefined}
          value={seats}
          onChange={(e) => onChange(Number(e.target.value) || MIN_SEATS)}
          onBlur={() => onChange(clampSeats(seats, plan))}
          className="w-20 text-center text-lg font-semibold"
        />
        <SeatStep
          label="Add a seat"
          blocked={maxSeats !== null && seats >= maxSeats}
          onStep={() => onChange(clampSeats(seats + 1, plan))}
        >
          <Plus className="h-4 w-4" />
        </SeatStep>
      </div>
      {/* Enterprise has no upper limit, so it only gets the number field */}
      {maxSeats !== null && (
        <div className="flex-1">
          <Slider
            aria-label="Seats"
            min={MIN_SEATS}
            max={maxSeats}
            step={1}
            value={[Math.min(seats, maxSeats)]}
            onValueChange={([v]) => v !== undefined && onChange(v)}
          />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>{MIN_SEATS}</span>
            <span>{maxSeats}</span>
          </div>
        </div>
      )}
    </div>
  );
}

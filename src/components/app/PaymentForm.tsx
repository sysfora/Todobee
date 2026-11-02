import { Lock, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type PaymentDetails = {
  name: string;
  email: string;
  card: string;
  expiry: string;
  cvc: string;
  country: string;
  postal: string;
};

export const emptyPayment: PaymentDetails = {
  name: "",
  email: "",
  card: "",
  expiry: "",
  cvc: "",
  country: "",
  postal: "",
};

const digits = (v: string) => v.replace(/\D/g, "");
const formatCard = (v: string) => digits(v).slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ");
const formatExpiry = (v: string) => {
  const d = digits(v).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d;
};

/** True when every field looks filled in correctly. */
export function paymentComplete(p: PaymentDetails) {
  const exp = digits(p.expiry);
  const month = Number(exp.slice(0, 2));
  return (
    p.name.trim().length > 1 &&
    /^\S+@\S+\.\S+$/.test(p.email.trim()) &&
    digits(p.card).length >= 13 &&
    exp.length === 4 &&
    month >= 1 &&
    month <= 12 &&
    digits(p.cvc).length >= 3 &&
    p.country.trim().length > 1 &&
    p.postal.trim().length > 2
  );
}

/**
 * Billing and card details. For now this only collects what people type on screen;
 * nothing is saved or sent anywhere until card payments are connected.
 */
export function PaymentForm({
  value,
  onChange,
}: {
  value: PaymentDetails;
  onChange: (v: PaymentDetails) => void;
}) {
  const set = (key: keyof PaymentDetails) => (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value;
    if (key === "card") v = formatCard(v);
    if (key === "expiry") v = formatExpiry(v);
    if (key === "cvc") v = digits(v).slice(0, 4);
    onChange({ ...value, [key]: v });
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field id="pay-name" label="Name on card" className="sm:col-span-1">
        <Input id="pay-name" autoComplete="cc-name" value={value.name} onChange={set("name")} />
      </Field>
      <Field id="pay-email" label="Billing email">
        <Input
          id="pay-email"
          type="email"
          autoComplete="email"
          value={value.email}
          onChange={set("email")}
        />
      </Field>
      <Field id="pay-card" label="Card number" className="sm:col-span-2">
        <div className="relative">
          <Input
            id="pay-card"
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="1234 1234 1234 1234"
            value={value.card}
            onChange={set("card")}
            className="pr-24"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-1"
          >
            <VisaMark />
            <MastercardMark />
            <AmexMark />
          </div>
        </div>
      </Field>
      <Field id="pay-exp" label="Expiry date">
        <Input
          id="pay-exp"
          inputMode="numeric"
          autoComplete="cc-exp"
          placeholder="MM / YY"
          value={value.expiry}
          onChange={set("expiry")}
        />
      </Field>
      <Field id="pay-cvc" label="Security code">
        <Input
          id="pay-cvc"
          inputMode="numeric"
          autoComplete="cc-csc"
          placeholder="CVC"
          value={value.cvc}
          onChange={set("cvc")}
        />
      </Field>
      <Field id="pay-country" label="Country">
        <Input
          id="pay-country"
          autoComplete="country-name"
          value={value.country}
          onChange={set("country")}
        />
      </Field>
      <Field id="pay-postal" label="Postal or ZIP code">
        <Input
          id="pay-postal"
          autoComplete="postal-code"
          value={value.postal}
          onChange={set("postal")}
        />
      </Field>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground sm:col-span-2">
        <span className="flex items-center gap-1.5">
          <Lock aria-hidden className="size-3.5 shrink-0" /> Secure, encrypted checkout
        </span>
        <span className="flex items-center gap-1.5">
          <ShieldCheck aria-hidden className="size-3.5 shrink-0" /> Card details are never saved by
          Todobee
        </span>
      </div>
    </div>
  );
}

/** Small card-brand trust marks, drawn inline so no images are needed. */
function VisaMark() {
  return (
    <span className="flex h-5 w-8 items-center justify-center rounded-[4px] border border-border bg-card">
      <svg viewBox="0 0 32 12" className="h-2.5 w-auto" role="img" aria-label="Visa">
        <text
          x="16"
          y="10"
          textAnchor="middle"
          fontSize="11"
          fontWeight="700"
          fontStyle="italic"
          fill="#1A1F71"
          fontFamily="Arial, sans-serif"
        >
          VISA
        </text>
      </svg>
    </span>
  );
}

function MastercardMark() {
  return (
    <span className="flex h-5 w-8 items-center justify-center rounded-[4px] border border-border bg-card">
      <svg viewBox="0 0 24 14" className="h-3 w-auto" role="img" aria-label="Mastercard">
        <circle cx="9" cy="7" r="6" fill="#EB001B" />
        <circle cx="15" cy="7" r="6" fill="#F79E1B" fillOpacity="0.85" />
      </svg>
    </span>
  );
}

function AmexMark() {
  return (
    <span className="flex h-5 w-8 items-center justify-center rounded-[4px] border border-border bg-card">
      <svg viewBox="0 0 32 12" className="h-2.5 w-auto" role="img" aria-label="American Express">
        <rect width="32" height="12" rx="2" fill="#2E77BC" />
        <text
          x="16"
          y="9"
          textAnchor="middle"
          fontSize="7"
          fontWeight="700"
          fill="#FFFFFF"
          fontFamily="Arial, sans-serif"
        >
          AMEX
        </text>
      </svg>
    </span>
  );
}

function Field({
  id,
  label,
  className,
  children,
}: {
  id: string;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label htmlFor={id} className="mb-1.5 block">
        {label}
      </Label>
      {children}
    </div>
  );
}

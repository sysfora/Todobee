"use client";
import { Link } from "@/lib/nav";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, Download, Lock, Monitor, Moon, Pencil, Sun, Trash2, Upload } from "lucide-react";
import { getTheme, setTheme, type Theme } from "@/lib/theme";
import { playCompleteSound, setSoundsEnabled, soundsEnabled } from "@/lib/sounds";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { startPlanChange } from "@/lib/account";
import { isDemo } from "@/lib/demo-mode";
import { actions, DEFAULT_PREFS, getState, useAppState } from "@/lib/store";
import { SWATCHES, labelVar, swatchName, type Swatch } from "@/lib/colors";
import {
  getPlan,
  isAdmin,
  roleLabel,
  planMaxSeats,
  MIN_SEATS,
  planAllows,
  seatChangeError,
  activeInvites,
  billingChange,
  defaultRenewal,
  formatRenewal,
  money,
  type PlanId,
} from "@/lib/subscription";
import type { NotificationPrefs } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PlanCards, SeatPicker } from "@/components/app/PlanPicker";
import { PageTitle, UserAvatar, iconAction } from "@/components/app/primitives";
import { ConfirmDialog } from "@/components/app/ConfirmDialog";

const SECTIONS = [
  "profile",
  "notifications",
  "themes",
  "sounds",
  "labels",
  "subscriptions",
  "backups",
] as const;
type SectionId = (typeof SECTIONS)[number];
const ADMIN_ONLY: SectionId[] = ["labels", "subscriptions", "backups"];

const NAV: { id: SectionId; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "notifications", label: "Notifications" },
  { id: "themes", label: "Themes" },
  { id: "sounds", label: "Sounds" },
  { id: "labels", label: "Labels" },
  { id: "subscriptions", label: "Subscriptions" },
  { id: "backups", label: "Backups" },
];

export function SettingsPage() {
  const state = useAppState();
  const me = state.users.find((u) => u.id === state.currentUserId);
  const admin = isAdmin(me);
  const requested = useSearchParams().get("section") as SectionId | null;
  const allowed = NAV.filter((n) => admin || !ADMIN_ONLY.includes(n.id));
  const section = allowed.some((n) => n.id === requested) ? requested! : "profile";
  const [labelOpen, setLabelOpen] = useState(false);

  return (
    <div className="space-y-5 px-4 py-6 md:px-8">
      <div className="grid min-h-10 grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <PageTitle>{admin ? "Settings" : "Profile"}</PageTitle>
        {section === "labels" && <Button onClick={() => setLabelOpen(true)}>Create Label</Button>}
      </div>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <nav
          aria-label="Settings sections"
          className="grid shrink-0 grid-cols-2 gap-1 overflow-hidden rounded-lg bg-card p-1 shadow-card sm:grid-cols-3 lg:flex lg:w-56 lg:flex-col lg:gap-0 lg:px-0 lg:py-0"
        >
          {allowed.map((n) => (
            <Link
              key={n.id}
              to="/settings"
              search={{ section: n.id }}
              className={cn(
                "rounded-md px-4 py-2.5 text-center text-[0.95rem] whitespace-nowrap transition-colors lg:rounded-none lg:px-5 lg:py-3 lg:text-left",
                section === n.id
                  ? "bg-primary-container font-semibold text-on-primary-container"
                  : "text-foreground hover:bg-foreground/5",
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="min-w-0 flex-1">
          {section === "profile" && <ProfileSection />}
          {section === "notifications" && <NotificationsSection />}
          {section === "themes" && <ThemesSection />}
          {section === "sounds" && <SoundsSection />}
          {section === "labels" && (
            <LabelsSection createOpen={labelOpen} setCreateOpen={setLabelOpen} />
          )}
          {section === "subscriptions" && <SubscriptionSection />}
          {section === "backups" && <BackupsSection />}
        </div>
      </div>
    </div>
  );
}

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg bg-card p-6 shadow-card">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ThemesSection() {
  const darkOk = planAllows(useAppState().workspace.plan, "darkMode");
  const [theme, setThemeState] = useState<Theme>("light");
  useEffect(() => setThemeState(darkOk ? getTheme() : "light"), [darkOk]);
  const options: { id: Theme; label: string; icon: typeof Sun; hint: string }[] = [
    { id: "light", label: "Light", icon: Sun, hint: "The default look." },
    { id: "dark", label: "Dark", icon: Moon, hint: "Easier on the eyes at night." },
    { id: "system", label: "System", icon: Monitor, hint: "Follows your device setting." },
  ];
  return (
    <Card title="Themes" description="Choose how Todobee looks on this device.">
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(9rem,1fr))]">
        {options.map((o) => {
          const locked = !darkOk && o.id !== "light";
          return (
            <button
              key={o.id}
              disabled={locked}
              aria-disabled={locked}
              onClick={() => {
                setTheme(o.id);
                setThemeState(o.id);
              }}
              className={cn(
                "flex flex-col items-start gap-2 rounded-lg border-2 p-4 text-left transition-colors",
                theme === o.id ? "border-primary bg-primary/5" : "border-border hover:border-input",
                locked && "cursor-not-allowed opacity-60 hover:border-border",
              )}
            >
              <o.icon className="h-5 w-5 text-foreground" strokeWidth={1.6} />
              <span className="flex items-center gap-2 font-semibold text-foreground">
                {o.label} {locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
              </span>
              <span className="text-sm text-muted-foreground">
                {locked ? "Available on Pro and Enterprise." : o.hint}
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function SoundsSection() {
  const [on, setOn] = useState(true);
  useEffect(() => setOn(soundsEnabled()), []);
  return (
    <Card title="Sounds" description="Choose whether Todobee plays sounds on this device.">
      <div className="flex items-center justify-between gap-4 py-1">
        <div>
          <p className="font-medium text-foreground">Sound effects</p>
          <p className="text-sm text-muted-foreground">
            Play a short chime when you complete a task.
          </p>
        </div>
        <Switch
          aria-label="Sound effects"
          checked={on}
          onCheckedChange={(v) => {
            setSoundsEnabled(v);
            setOn(v);
            if (v) playCompleteSound();
          }}
        />
      </div>
    </Card>
  );
}

function ProfileSection() {
  const state = useAppState();
  const me = state.users.find((u) => u.id === state.currentUserId);
  const [name, setName] = useState(me?.name ?? "");
  const photoRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (me?.name) setName(me.name);
  }, [me?.name]);
  if (!me) return null;
  return (
    <Card title="Profile" description="Your name is shown to everyone on your projects.">
      <div className="flex items-center gap-4">
        <UserAvatar
          decorative
          user={{ ...me, name: name || me.name }}
          className="h-16 w-16 text-lg ring-0"
        />
        <div className="min-w-0">
          <p className="font-medium [overflow-wrap:anywhere] text-foreground">{me.email}</p>
          <p className="text-sm text-muted-foreground">{roleLabel(me.role)}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <input
          ref={photoRef}
          type="file"
          accept="image/*"
          className="hidden"
          aria-label="Upload profile picture"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            try {
              actions.updateUser(me.id, { avatar: await resizeImage(f, 256) });
              toast.success("Profile picture updated");
            } catch {
              toast.error("That image couldn't be read");
            }
          }}
        />
        <Button type="button" onClick={() => photoRef.current?.click()}>
          <Upload /> {me.avatar ? "Change picture" : "Upload picture"}
        </Button>
        {me.avatar && (
          <Button
            type="button"
            variant="outline"
            onClick={() => actions.updateUser(me.id, { avatar: "" })}
          >
            Remove
          </Button>
        )}
      </div>
      <form
        className="mt-6 max-w-sm space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          actions.updateUser(me.id, { name: name.trim() });
          toast.success("Profile saved");
        }}
      >
        <label htmlFor="profile-name" className="text-sm font-medium">
          Name
        </label>
        <Input
          id="profile-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
        />
        <Button type="submit">Save</Button>
      </form>
    </Card>
  );
}

function NotificationsSection() {
  const state = useAppState();
  const prefs: NotificationPrefs = {
    ...DEFAULT_PREFS,
    ...state.notificationPrefs[state.currentUserId],
  };
  const emailAllowed = planAllows(state.workspace.plan, "emailNotifications");
  const rows: { key: keyof NotificationPrefs; label: string; hint: string; locked?: boolean }[] = [
    { key: "dueToday", label: "Due today", hint: "Tasks assigned to you that are due today." },
    {
      key: "overdue",
      label: "Overdue",
      hint: "Tasks assigned to you that are past their due date.",
    },
    { key: "assigned", label: "Assigned to me", hint: "When someone assigns you a task." },
    {
      key: "email",
      label: "Email notifications",
      hint: emailAllowed ? "Also send these to your inbox." : "Available on Pro and Enterprise.",
      locked: !emailAllowed,
    },
  ];
  return (
    <Card title="Notifications" description="Choose what shows up under the bell.">
      <ul className="divide-y">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center justify-between gap-4 py-3.5">
            <div>
              <p className="flex items-center gap-2 font-medium text-foreground">
                {r.label} {r.locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
              </p>
              <p className="text-sm text-muted-foreground">{r.hint}</p>
            </div>
            <Switch
              aria-label={r.label}
              disabled={r.locked}
              checked={!r.locked && prefs[r.key]}
              onCheckedChange={(v) =>
                actions.setNotificationPrefs(state.currentUserId, { [r.key]: v })
              }
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}

function LabelsSection({
  createOpen,
  setCreateOpen,
}: {
  createOpen: boolean;
  setCreateOpen: (o: boolean) => void;
}) {
  const { labels } = useAppState();
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const editLabel = labels.find((l) => l.id === editing);
  return (
    <section className="overflow-hidden rounded-lg bg-card shadow-card">
      {labels.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-muted-foreground">
          No labels yet. Create one to start sorting tasks.
        </p>
      ) : (
        <ul className="divide-y">
          {labels.map((l) => (
            <li key={l.id} className="flex items-center gap-3 px-6 py-4">
              <span
                aria-hidden="true"
                className="h-4 w-4 shrink-0 rounded-sm"
                style={{ backgroundColor: labelVar(l.color) }}
              />
              <span className="min-w-0 flex-1 truncate font-medium text-foreground">{l.name}</span>
              <button
                aria-label={`Edit ${l.name}`}
                onClick={() => setEditing(l.id)}
                className={iconAction}
              >
                <Pencil className="h-4 w-4" strokeWidth={1.6} />
              </button>
              <button
                aria-label={`Delete ${l.name}`}
                onClick={() => setDeleting(l.id)}
                className={cn(iconAction, "hover:text-danger")}
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.6} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <LabelDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create label"
        onSave={(name, color) => actions.createLabel({ name, color })}
      />
      <LabelDialog
        key={editing ?? "none"}
        open={!!editLabel}
        onOpenChange={(o) => !o && setEditing(null)}
        title="Edit label"
        initialName={editLabel?.name}
        initialColor={editLabel?.color}
        onSave={(name, color) => editLabel && actions.updateLabel(editLabel.id, { name, color })}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete label?"
        description="It will be removed from every task."
        onConfirm={() => deleting && actions.deleteLabel(deleting)}
      />
    </section>
  );
}

function LabelDialog({
  open,
  onOpenChange,
  title,
  initialName = "",
  initialColor = "blue",
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  initialName?: string | undefined;
  initialColor?: Swatch | undefined;
  onSave: (name: string, color: Swatch) => void;
}) {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState<Swatch>(initialColor);
  useEffect(() => {
    if (open) {
      setName(initialName);
      setColor(initialColor);
    }
  }, [open, initialName, initialColor]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            onSave(name.trim(), color);
            onOpenChange(false);
          }}
        >
          <div className="space-y-1.5">
            <label htmlFor="label-name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="label-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Color</p>
            <div className="flex flex-wrap gap-2">
              {SWATCHES.map((c) => (
                <button
                  type="button"
                  key={c}
                  aria-label={swatchName(c)}
                  aria-pressed={c === color}
                  onClick={() => setColor(c)}
                  className="flex h-7 w-7 items-center justify-center rounded-md"
                  style={{ backgroundColor: labelVar(c) }}
                >
                  {c === color && <Check className="h-4 w-4 text-on-swatch" />}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SubscriptionSection() {
  const { workspace, users, invites } = useAppState();
  const [seats, setSeats] = useState(workspace.seats);
  const [plan, setPlan] = useState<PlanId>(workspace.plan);
  useEffect(() => {
    setSeats(workspace.seats);
    setPlan(workspace.plan);
  }, [workspace.seats, workspace.plan]);

  const used = users.length + activeInvites(invites).length;
  const error = seatChangeError(seats, used, plan);
  const maxSeats = planMaxSeats(plan);
  const changed = seats !== workspace.seats || plan !== workspace.plan;
  const renewsAt = workspace.renewsAt ?? defaultRenewal();
  const bill = billingChange(workspace, { plan, seats }, renewsAt);
  const renewal = formatRenewal(renewsAt);

  const requestSave = async () => {
    if (plan === "enterprise" && workspace.plan !== "enterprise") {
      toast("Enterprise is set up with our team", {
        description: "We'll contact you to set up your Shared Drive and multiple admins.",
      });
      return;
    }
    const err = seatChangeError(seats, used, plan);
    if (err) {
      toast.error(err);
      return;
    }
    try {
      const result = await startPlanChange(plan, seats);
      if (result === "redirect") return;
      toast.success(isDemo ? "Demo plan updated" : "Subscription updated", {
        description: isDemo ? "Nothing was charged." : "Nothing is due today. The new price starts at renewal.",
      });
    } catch (error) {
      toast.error("We couldn't update your subscription", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card
        title="Your plan"
        description="All plans are billed yearly, per seat. Every user takes one seat."
      >
        <PlanCards value={plan} onChange={setPlan} currentPlan={workspace.plan} />
      </Card>

      <Card
        title="Seats"
        description={`${
          maxSeats
            ? `Between ${MIN_SEATS} and ${maxSeats} seats.`
            : `At least ${MIN_SEATS} seats, no upper limit.`
        } You're using ${used} of ${workspace.seats}. Added seats are charged only for the days left until renewal.`}
      >
        <SeatPicker seats={seats} onChange={setSeats} plan={plan} />

        {error && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-danger">
            {error}
            {seats < used && (
              <Link to="/users" className="font-medium underline">
                Manage users
              </Link>
            )}
          </div>
        )}
      </Card>

      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-4 rounded-lg bg-card p-6 shadow-card">
        <div>
          <p className="text-sm text-muted-foreground">
            {getPlan(plan).name} · {seats} seats · renews {renewal}
          </p>
          <p className="text-2xl font-semibold text-foreground">
            {money(bill.atRenewal)}{" "}
            <span className="text-sm font-normal text-muted-foreground">/ year</span>
          </p>
          {changed && !error && (
            <p className="mt-1 text-sm text-foreground">
              {bill.dueToday > 0 ? (
                <>
                  <span className="font-semibold">{money(bill.dueToday)} due today</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · only the extra cost, for the {bill.daysLeft} days left until renewal
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">
                  Nothing to pay today. The new price starts at renewal.
                </span>
              )}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {changed && (
            <Button
              variant="ghost"
              onClick={() => {
                setSeats(workspace.seats);
                setPlan(workspace.plan);
              }}
            >
              Cancel
            </Button>
          )}
          <Button disabled={!changed || !!error} onClick={requestSave}>
            {plan === "enterprise" && workspace.plan !== "enterprise"
              ? "Contact sales"
              : bill.dueToday > 0
                ? `Pay ${money(bill.dueToday)}`
                : "Update subscription"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function BackupsSection() {
  const { workspace } = useAppState();
  const allowed = planAllows(workspace.plan, "backups");
  const fileRef = useRef<HTMLInputElement>(null);
  const decided = useRef(false);
  const [pending, setPending] = useState<unknown>(null);
  const [conflicts, setConflicts] = useState<string[]>([]);

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(getState(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `todobee-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const applyBackup = (data: unknown, choice: "skip" | "override" | "copy") => {
    const result = actions.importBackup(data, choice);
    if (result.added === 0 && result.replaced === 0 && result.copied === 0) {
      toast.error("Those projects already exist", {
        description: "Nothing was changed. Override a project, or add it as a copy with a different name.",
      });
      return;
    }
    const parts: string[] = [];
    if (result.added) parts.push(`${result.added} project${result.added === 1 ? "" : "s"} added`);
    if (result.replaced) parts.push(`${result.replaced} overridden`);
    if (result.copied) parts.push(`${result.copied} added as ${result.copied === 1 ? "a copy" : "copies"}`);
    toast.success(parts.join(", "));
  };

  const importBackup = async (f: File | undefined) => {
    if (!f) return;
    try {
      const data = JSON.parse(await f.text()) as unknown;
      const names = actions.backupProjectConflicts(data);
      if (names.length) {
        decided.current = false;
        setPending(data);
        setConflicts(names);
        return;
      }
      applyBackup(data, "skip");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That file isn't a Todobee backup");
    }
  };

  const finishRestore = (choice: "skip" | "override" | "copy") => {
    if (pending === null) return;
    decided.current = true;
    try {
      applyBackup(pending, choice);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That file isn't a Todobee backup");
    }
    setPending(null);
    setConflicts([]);
  };

  const conflictList =
    conflicts.length === 1
      ? `“${conflicts[0]}” is already in this workspace.`
      : `These projects already exist: ${conflicts.join(", ")}.`;

  return (
    <Card title="Backups" description="Download a copy of this workspace, or add projects and tasks from a backup. People, settings and your subscription stay as they are.">
      {!allowed ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted px-4 py-3 text-sm">
          <span className="flex items-center gap-2 text-foreground">
            <Lock className="h-4 w-4" /> Export Backups is available on Pro and Enterprise.
          </span>
          <Link
            to="/settings"
            search={{ section: "subscriptions" }}
            className="font-medium text-link hover:underline"
          >
            See plans
          </Link>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <Button onClick={exportBackup}>
            <Download className="mr-1.5 h-4 w-4" /> Export backup
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="mr-1.5 h-4 w-4" /> Restore from file
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              void importBackup(file);
            }}
          />
          <Dialog
            open={pending !== null}
            onOpenChange={(open) => {
              if (open) return;
              if (!decided.current && pending !== null) {
                try {
                  applyBackup(pending, "skip");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "That file isn't a Todobee backup");
                }
              }
              decided.current = false;
              setPending(null);
              setConflicts([]);
            }}
          >
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>A project with this name already exists</DialogTitle>
              </DialogHeader>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {conflictList} Project names have to be different. Override the current{" "}
                {conflicts.length === 1 ? "project" : "projects"}, or add{" "}
                {conflicts.length === 1 ? `“${conflicts[0]}_Copy”` : "each one as a copy"} so both stay.
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  className="w-full shadow-none hover:shadow-none"
                  onClick={() => finishRestore("override")}
                >
                  Override current project
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full shadow-none hover:shadow-none"
                  onClick={() => finishRestore("copy")}
                >
                  Add as {conflicts.length === 1 ? `${conflicts[0]}_Copy` : "name_Copy"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => finishRestore("skip")}
                >
                  Keep current projects
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </Card>
  );
}

/** Square-crops and shrinks an image to a small JPEG data URL for avatars. */
async function resizeImage(file: File, size: number): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const c = document.createElement("canvas");
    c.width = c.height = size;
    c.getContext("2d")!.drawImage(
      img,
      (img.naturalWidth - side) / 2,
      (img.naturalHeight - side) / 2,
      side,
      side,
      0,
      0,
      size,
      size,
    );
    return c.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

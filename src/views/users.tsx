"use client";
import { useNavigate } from "@/lib/nav";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronsUpDown, Trash2 } from "lucide-react";
import { PENDING_INVITE_KEY } from "@/lib/account";
import { isDemo } from "@/lib/demo-mode";
import { actions, useAppState, useStoreHydrated } from "@/lib/store";
import type { User } from "@/lib/types";
import {
  activeInvites,
  canAddSeat,
  canAddUser,
  getPlan,
  isAdmin,
  roleLabel,
} from "@/lib/subscription";
import { formatDue } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PageTitle, UserAvatar, iconAction } from "@/components/app/primitives";
import { UserDialog } from "@/components/app/UserDialog";
import { ConfirmDialog } from "@/components/app/ConfirmDialog";
import { SearchInput } from "@/components/app/SearchInput";


export function UsersPage() {
  const navigate = useNavigate();
  const hydrated = useStoreHydrated();
  const { users, currentUserId, workspace, invites: allInvites } = useAppState();
  useEffect(() => {
    if (!hydrated || isDemo) return;
    const raw = sessionStorage.getItem(PENDING_INVITE_KEY);
    if (!raw) return;
    let pending: { name?: string; email?: string; role?: User["role"]; fromSeats?: number };
    try {
      pending = JSON.parse(raw) as typeof pending;
    } catch {
      sessionStorage.removeItem(PENDING_INVITE_KEY);
      return;
    }
    if (!pending.email || !pending.name) {
      sessionStorage.removeItem(PENDING_INVITE_KEY);
      return;
    }
    if (typeof pending.fromSeats === "number" && workspace.seats <= pending.fromSeats) return;
    sessionStorage.removeItem(PENDING_INVITE_KEY);
    const err = actions.inviteUser(
      { name: pending.name, email: pending.email, role: pending.role === "Admin" ? "Admin" : "Member" },
      { addSeat: false },
    );
    if (err) toast.error(err);
    else toast.success(`Invite saved for ${pending.email}`);
  }, [hydrated, workspace.seats]);
  const invites = activeInvites(allInvites);
  const used = users.length + invites.length;
  const [seatsFull, setSeatsFull] = useState(false);
  const me = users.find((u) => u.id === currentUserId);
  // When seats run out the invite dialog offers to add one; only a plan's seat limit blocks it.
  const openCreate = () =>
    canAddUser(used, workspace.seats) || canAddSeat(workspace.seats, workspace.plan)
      ? setDialog({ open: true })
      : setSeatsFull(true);
  const [query, setQuery] = useState("");
  const [asc, setAsc] = useState<boolean | null>(true);
  const [dialog, setDialog] = useState<{ open: boolean; user?: User }>({ open: false });
  const [deleting, setDeleting] = useState<User | undefined>();

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
    if (asc === null) return list;
    return [...list].sort((a, b) => (asc ? 1 : -1) * a.name.localeCompare(b.name));
  }, [users, query, asc]);

  if (!isAdmin(me)) {
    return (
      <div className="space-y-3 px-4 py-6 md:px-8">
        <PageTitle>Users</PageTitle>
        <p className="text-muted-foreground">Only admins can manage users.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 py-6 md:px-8">
      <div className="flex flex-wrap items-center gap-4 lg:flex-nowrap">
        <PageTitle className="mr-auto">Users</PageTitle>
        <span className="hidden shrink-0 text-sm text-muted-foreground sm:inline">
          {used} of {workspace.seats} seats used
        </span>
        <SearchInput
          value={query}
          onChange={setQuery}
          className="order-last max-w-none lg:order-none lg:max-w-sm"
        />
        <Button className="shrink-0" onClick={openCreate}>
          Invite User
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg bg-card shadow-card">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center border-b bg-panel px-6 py-3.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase sm:grid-cols-[minmax(0,1fr)_7rem_3rem] sm:gap-4">
          <button
            onClick={() => setAsc((v) => (v === null ? true : !v))}
            aria-label={`Sort by name, ${asc === false ? "A to Z" : "Z to A"}`}
            className="flex items-center gap-1 uppercase"
          >
            Name <ChevronsUpDown className="h-3.5 w-3.5" />
          </button>
          <span className="hidden sm:block">Role</span>
          <span />
        </div>
        {rows.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">No users found.</p>
        ) : (
          <ul className="divide-y">
            {rows.map((u) => (
              <li
                key={u.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center px-6 py-3.5 hover:bg-panel sm:grid-cols-[minmax(0,1fr)_7rem_3rem] sm:gap-4"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <UserAvatar user={u} className="h-10 w-10 ring-0" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{u.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{u.email}</p>
                  </div>
                </div>
                <span className="hidden text-muted-foreground sm:block">{roleLabel(u.role)}</span>
                <div className="flex items-center justify-end gap-3 text-muted-foreground">
                  <button
                    aria-label={`Delete ${u.name}`}
                    disabled={u.id === currentUserId}
                    title={u.id === currentUserId ? "You can't delete yourself" : undefined}
                    onClick={() => setDeleting(u)}
                    className={cn(iconAction, "hover:text-danger")}
                  >
                    <Trash2 className="h-5 w-5" strokeWidth={1.5} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {invites.length > 0 && (
        <section
          aria-labelledby="pending-invites"
          className="overflow-hidden rounded-lg bg-card shadow-card"
        >
          <h2
            id="pending-invites"
            className="border-b bg-panel px-6 py-3.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase"
          >
            Pending invites ({invites.length})
          </h2>
          <ul className="divide-y">
            {invites.map((i) => (
              <li
                key={i.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-6 py-3.5"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{i.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {i.email} · {roleLabel(i.role)} · expires {formatDue(i.expiresAt.slice(0, 10))}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => actions.resendInvite(i.id)}
                  >
                    Resend
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => actions.revokeInvite(i.id)}>
                    Revoke
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <UserDialog
        open={dialog.open}
        user={dialog.user}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
      />
      <ConfirmDialog
        open={seatsFull}
        onOpenChange={setSeatsFull}
        title="Your plan is at its seat limit"
        description={`${getPlan(workspace.plan).name} allows up to ${workspace.seats} seats, and they're all in use. Switch to Enterprise to invite more users.`}
        confirmLabel="See plans"
        tone="default"
        onConfirm={() => navigate({ to: "/settings", search: { section: "subscriptions" } })}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(undefined)}
        title="Delete user?"
        description={`${deleting?.name} will lose access to this workspace. If it is their only workspace, their next visit starts as a new user.`}
        onConfirm={() => {
          if (deleting && !actions.deleteUser(deleting.id))
            toast.error("This user can't be deleted", {
              description: "The workspace needs at least one admin.",
            });
        }}
      />
    </div>
  );
}

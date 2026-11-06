import { useEffect, useState } from "react";
import { z } from "zod";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isDemo } from "@/lib/demo-mode";
import { actions, useAppState } from "@/lib/store";
import type { Role, User } from "@/lib/types";
import {
  activeInvites,
  billingChange,
  canChooseRole,
  defaultRenewal,
  formatRenewal,
  money,
  seatsNeededForInvite,
} from "@/lib/subscription";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  email: z.string().trim().email("Enter a valid email").max(120),
});

export function UserDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  user?: User | undefined;
}) {
  const { users, workspace, invites } = useAppState();
  const showRole = canChooseRole(workspace.plan);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("Member");
  const [error, setError] = useState("");

  const used = users.length + activeInvites(invites).length;
  const addSeat = !user && seatsNeededForInvite(used, workspace.seats) > 0;
  const renewsAt = workspace.renewsAt ?? defaultRenewal();
  const bill = billingChange(
    workspace,
    { plan: workspace.plan, seats: workspace.seats + 1 },
    renewsAt,
  );

  useEffect(() => {
    if (!open) return;
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
    setRole(user?.role ?? "Member");
    setError("");
  }, [open, user]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ name, email });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Invalid input");
    const taken = users.some(
      (u) => u.id !== user?.id && u.email.toLowerCase() === parsed.data.email.toLowerCase(),
    );
    if (taken) return setError("A user with this email already exists");
    if (!user) {
      const err = actions.inviteUser(
        { ...parsed.data, role: showRole ? role : "Member" },
        { addSeat },
      );
      if (err) return setError(err);
      toast.success(`Invite saved for ${parsed.data.email}`, {
        description: isDemo
          ? "Saved in this browser only. No email is sent."
          : addSeat
            ? `Your subscription now has ${workspace.seats + 1} seats.`
            : "It stays open for 30 days and holds a seat until then.",
      });
      return onOpenChange(false);
    }
    // Outside Enterprise there is one admin, so new users are always Members and roles don't change.
    if (user) {
      if (!actions.updateUser(user.id, showRole ? { ...parsed.data, role } : parsed.data))
        return setError("The workspace needs at least one admin.");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0 [&>button:last-child]:hidden">
        <form onSubmit={submit}>
          <div className="space-y-4 px-6 pt-6 pb-5">
            <DialogTitle className="text-lg font-semibold">
              {user ? "Edit User" : "Invite User"}
            </DialogTitle>
            <div className="space-y-1.5">
              <label htmlFor="user-name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="user-name"
                autoFocus
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="user-email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="user-email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {showRole && (
              <div className="space-y-1.5">
                <span className="text-sm font-medium">Role</span>
                <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Member">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {!user && addSeat && (
              <div className="space-y-2 rounded-lg bg-primary-container px-4 py-3 text-sm text-on-primary-container">
                <p className="font-semibold">All {workspace.seats} seats are in use</p>
                <p>
                  Sending this invite adds 1 seat. Your subscription changes from {workspace.seats}{" "}
                  to {workspace.seats + 1} seats.
                </p>
                <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 pt-1">
                  <dt>Due today</dt>
                  <dd className="text-right font-semibold">{money(bill.dueToday)}</dd>
                  <dt className="col-span-2 -mt-1 text-xs opacity-80">
                    For 1 seat, for the {bill.daysLeft} days left until renewal
                  </dt>
                  <dt>From {formatRenewal(renewsAt)}</dt>
                  <dd className="text-right font-semibold">{money(bill.atRenewal)} / year</dd>
                </dl>
              </div>
            )}
            {error && <p className="text-sm text-danger">{error}</p>}
          </div>
          <div className="flex justify-end gap-2 rounded-b-3xl px-6 pt-2 pb-6">
            <Button
              type="button"
              variant="ghost"
              className="text-primary"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {user ? "Save Changes" : addSeat ? "Add Seat & Send Invite" : "Send Invite"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

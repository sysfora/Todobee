"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, CircleCheck, Inbox, Loader2 } from "lucide-react";
import { ink, tint } from "@/lib/colors";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAppState } from "@/lib/store";
import {
  completedByMonth,
  completedLast7Days,
  dashboardStats,
  scopeToUser,
} from "@/lib/task-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageTitle } from "@/components/app/primitives";
import { buttonVariants } from "@/components/ui/button";
import { useGoogleSignIn } from "@/hooks/use-google-sign-in";
import { accountQuery } from "@/lib/account";
import { isDemo } from "@/lib/demo-mode";
import { cn } from "@/lib/utils";

function DrivePermissionError() {
  const { signIn, busy } = useGoogleSignIn({ consent: true });
  return (
    <div role="alert" className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-4 sm:px-5">
      <p className="text-base font-medium text-foreground">Google Drive permission required</p>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
      Todobee needs your permission to save and sync your work with Google Drive. Please sign in again and allow the requested permissions to enable syncing.
      </p>
      <button
        type="button"
        onClick={() => signIn()}
        disabled={busy}
        className={cn(buttonVariants(), "mt-4 w-full shadow-none hover:shadow-none sm:w-auto")}
      >
        {busy && <Loader2 className="animate-spin" aria-hidden />}
        Sign in again
      </button>
    </div>
  );
}

export function Dashboard() {
  const account = useQuery({ ...accountQuery, enabled: !isDemo }).data;
  const full = useAppState();
  const [userId, setUserId] = useState("all");
  const state = useMemo(() => scopeToUser(full, userId), [full, userId]);
  const stats = dashboardStats(state);
  const week = useMemo(() => completedLast7Days(state.tasks, new Date()), [state.tasks]);
  const months = useMemo(
    () => completedByMonth(state.tasks, new Date().getFullYear()),
    [state.tasks],
  );

  return (
    <div className="space-y-6 px-4 py-6 md:px-8">
      {account && !account.driveConnected && <DrivePermissionError />}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageTitle>Dashboard</PageTitle>
        <Select value={userId} onValueChange={setUserId}>
          <SelectTrigger
            className="h-12 w-full rounded-xl text-[0.95rem] sm:w-56"
            aria-label="Filter by user"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All users</SelectItem>
            {full.users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-4 sm:grid-cols-3 md:gap-5">
        <StatCard icon={Inbox} label="Open Tasks" value={stats.open} color="var(--swatch-blue)" />
        <StatCard
          icon={CircleCheck}
          label="Completed Tasks"
          value={stats.completed}
          color="var(--swatch-green)"
        />
        <StatCard
          icon={CalendarDays}
          label="Total Projects"
          value={stats.projects}
          color="var(--swatch-violet)"
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Completed in the last 7 days" data={week} />
        <ChartCard title="Most productive month" data={months} />
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Inbox;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-card md:gap-5 md:p-6">
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl md:h-14 md:w-14"
        style={{ backgroundColor: tint(color), color: ink(color) }}
      >
        <Icon className="h-7 w-7" strokeWidth={1.7} />
      </div>
      <div>
        <p className="text-sm leading-tight text-muted-foreground md:text-[0.95rem]">{label}</p>
        <p className="text-[2rem] leading-tight font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function ChartCard({ title, data }: { title: string; data: { label: string; count: number }[] }) {
  return (
    <div className="rounded-2xl bg-card px-6 pt-5 pb-4 shadow-card">
      <h2 className="mb-5 text-lg font-medium text-foreground">{title}</h2>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 12, left: -24, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              tickMargin={8}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              tickMargin={6}
            />
            <Tooltip
              cursor={{ stroke: "var(--input)" }}
              contentStyle={{
                borderRadius: 12,
                border: "none",
                boxShadow: "var(--shadow-panel)",
                fontSize: 13,
                backgroundColor: "var(--popover)",
                color: "var(--popover-foreground)",
              }}
              labelStyle={{ color: "var(--popover-foreground)", fontWeight: 600 }}
              itemStyle={{ color: "var(--link)" }}
              formatter={(v: number) => [v, "Completed"]}
            />
            <Area
              type="linear"
              dataKey="count"
              stroke="var(--primary)"
              strokeWidth={2}
              fill="var(--primary)"
              fillOpacity={0.1}
              dot={{ r: 4, fill: "var(--card)", stroke: "var(--primary)", strokeWidth: 2 }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

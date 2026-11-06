import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ShellContext } from "./shell-context";
import { Link, useRouterState } from "@/lib/nav";
import {
  Bell,
  ChevronDown,
  CircleHelp,
  FolderClosed,
  Home,
  Menu,
  LogOut,
  Settings,
  SquareCheckBig,
  UserRound,
  LifeBuoy,
  MessageSquare,
  Bug,
  X,
} from "lucide-react";
import beeLight from "@/assets/todobee-bee-light.png.asset.json";
import beeDark from "@/assets/todobee-bee-dark.png.asset.json";
import { cn } from "@/lib/utils";
import { applyTheme, setDarkAllowed } from "@/lib/theme";
import { planAllows } from "@/lib/subscription";
import { accountQuery } from "@/lib/account";
import { useQuery } from "@tanstack/react-query";
import { DEFAULT_PREFS, hydrateStore, useAppState, useStoreHydrated } from "@/lib/store";
import { dueGroup } from "@/lib/task-utils";
import { formatDue, todayISO } from "@/lib/dates";
import type { Project } from "@/lib/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ColorDot, UserAvatar } from "./primitives";
import { ProjectDialog } from "./ProjectDialog";
import { useSignOut } from "@/hooks/use-sign-out";
import type { AccountRole } from "@/lib/permissions";

export function AppShell({ children, role }: { children: ReactNode; role: AccountRole }) {
  const hydrated = useStoreHydrated();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    hydrateStore(role);
    applyTheme();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [role]);

  const plan = useAppState().workspace.plan;
  useEffect(() => {
    if (hydrated) setDarkAllowed(planAllows(plan, "darkMode"));
  }, [plan, hydrated]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const toggleSidebar = () => {
    if (window.innerWidth < 768) setMobileOpen((o) => !o);
    else setCollapsed((c) => !c);
  };

  const ctx = useMemo(() => ({ openCreateProject: () => setCreateOpen(true) }), []);

  return (
    <ShellContext.Provider value={ctx}>
      <div className="flex h-dvh w-full flex-col overflow-hidden bg-background">
        <Header onToggleSidebar={toggleSidebar} sidebarOpen={mobileOpen || !collapsed} />
        <div className="flex min-h-0 flex-1">
          {/* Desktop sidebar */}
          <div className={cn("hidden shrink-0 md:block", collapsed && "md:hidden")}>
            <Sidebar pathname={pathname} />
          </div>
          {/* Mobile sidebar */}
          {/* Mobile sidebar: a real dialog so focus stays inside and Escape closes it */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetContent
              side="left"
              aria-describedby={undefined}
              className="flex w-72 max-w-[85vw] flex-col gap-0 rounded-r-3xl border-0 p-0 pt-3 shadow-panel md:hidden [&>button:first-child]:hidden"
            >
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between px-4 pb-2">
                  <Brand />
                  <button
                    aria-label="Close menu"
                    onClick={() => setMobileOpen(false)}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/8"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="min-h-0 flex-1">
                  <Sidebar pathname={pathname} />
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <main
            className={cn(
              "min-h-0 min-w-0 flex-1 overflow-auto rounded-t-3xl bg-surface scrollbar-thin md:mr-4 md:mb-4 md:rounded-3xl",
              collapsed && "md:ml-4",
            )}
          >
            {hydrated ? children : null}
          </main>
        </div>
      </div>
      <ProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
    </ShellContext.Provider>
  );
}

function Sidebar({ pathname }: { pathname: string }) {
  const { projects, users, currentUserId } = useAppState();
  const admin = users.find((u) => u.id === currentUserId)?.role === "Admin";
  // Favorites are always listed alphabetically and can't be rearranged.
  const favorites = projects.filter((p) => p.favorite).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <aside className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground">
      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 pt-2 pb-4 scrollbar-thin">
        {admin && (
          <NavItem to="/dashboard" icon={Home} label="Home" active={pathname === "/dashboard"} />
        )}
        <NavItem
          to="/my-tasks"
          icon={SquareCheckBig}
          label="My Tasks"
          active={pathname === "/my-tasks"}
        />
        <NavItem
          to="/projects"
          icon={FolderClosed}
          label="Projects"
          active={pathname === "/projects"}
        />
        {admin && (
          <NavItem to="/users" icon={UserRound} label="Users" active={pathname === "/users"} />
        )}

        {favorites.length > 0 && (
          <ProjectGroup title="Favorites" projects={favorites} pathname={pathname} />
        )}
      </nav>
    </aside>
  );
}

function NavItem({
  to,
  icon: Icon,
  label,
  active,
  action,
}: {
  to: "/dashboard" | "/my-tasks" | "/projects" | "/users";
  icon: typeof Home;
  label: string;
  active: boolean;
  action?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "group mb-1 flex h-11 items-center rounded-xl pr-1.5 transition-colors",
        active
          ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
          : "hover:bg-sidebar-hover",
      )}
    >
      <Link
        to={to}
        aria-current={active ? "page" : undefined}
        className="flex h-full flex-1 items-center gap-4 px-4 text-[0.95rem]"
      >
        <Icon className="h-5 w-5" strokeWidth={1.7} />
        {label}
      </Link>
      {action}
    </div>
  );
}

function ProjectGroup({
  title,
  projects,
  pathname,
}: {
  title: string;
  projects: Project[];
  pathname: string;
}) {
  const [open, setOpen] = useState(true);
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="mt-4 border-t border-sidebar-border pt-4"
    >
      <div className="flex items-center justify-between px-4 pb-2">
        <CollapsibleTrigger className="group/fav flex items-center gap-2 text-xs font-medium tracking-wider text-sidebar-muted uppercase hover:text-sidebar-foreground">
          {title}
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 opacity-0 transition group-hover/fav:opacity-100 group-focus-visible/fav:opacity-100",
              !open && "-rotate-90 opacity-100",
            )}
          />
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        {projects.map((p) => {
          const active = pathname === `/projects/${p.id}`;
          return (
            <Link
              key={p.id}
              to="/projects/$projectId"
              params={{ projectId: p.id }}
              aria-current={active ? "page" : undefined}
              className={cn(
                "mb-1 flex h-11 items-center gap-4 rounded-xl px-4 text-[0.95rem] transition-colors",
                active
                  ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                  : "hover:bg-sidebar-hover",
              )}
            >
              <ColorDot color={p.color} className="h-3 w-3" />
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
            </Link>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}

function Header({
  onToggleSidebar,
  sidebarOpen,
}: {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}) {
  const state = useAppState();
  const hydrated = useStoreHydrated();
  const me = state.users.find((u) => u.id === state.currentUserId);
  const signOut = useSignOut();
  const account = useQuery(accountQuery).data;
  const switchWorkspace = async (id: string) => {
    const res = await fetch("/api/workspaces/current", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const body = (await res.json().catch(() => ({}))) as { home?: string };
    if (res.ok) window.location.assign(body.home || "/dashboard");
  };

  const dismissKey = `todobee:dismissed:${state.currentUserId}`;
  const [dismissed, setDismissed] = useState<string[]>([]);
  useEffect(() => {
    try {
      setDismissed(JSON.parse(localStorage.getItem(dismissKey) ?? "[]"));
    } catch {
      setDismissed([]);
    }
  }, [dismissKey]);
  const dismiss = (key: string) => {
    const next = [...dismissed, key];
    setDismissed(next);
    localStorage.setItem(dismissKey, JSON.stringify(next));
  };
  const alertKey = (taskId: string, group: string, due?: string | null) =>
    `${taskId}:${group}:${due ?? ""}`;

  const alerts = useMemo(() => {
    if (!hydrated) return [];
    const today = todayISO();
    return state.tasks
      .filter((t) => !t.completed && t.assigneeIds.includes(state.currentUserId))
      .map((t) => ({ task: t, group: dueGroup(t, today) }))
      .filter((x) => {
        const prefs = { ...DEFAULT_PREFS, ...state.notificationPrefs[state.currentUserId] };
        if (x.group === "today" && prefs.dueToday) return true;
        if (x.group === "overdue" && prefs.overdue) return true;
        return Boolean(prefs.assigned) && (x.group === "upcoming" || x.group === "none");
      })
      .filter((x) => !dismissed.includes(alertKey(x.task.id, x.group, x.task.dueDate)));
  }, [state, hydrated, dismissed]);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 bg-background pr-3 pl-2 md:pr-4">
      <div className="flex min-w-0 items-center gap-1">
        <button
          aria-label="Toggle sidebar"
          aria-expanded={sidebarOpen}
          onClick={onToggleSidebar}
          className="flex h-12 w-12 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/8 hover:text-foreground"
        >
          <Menu className="h-5 w-5" strokeWidth={1.8} />
        </button>
        <Brand />
      </div>
      <div className="flex items-center gap-0.5 sm:gap-1">
        <Popover>
          <PopoverTrigger aria-label="Notifications" className={cn(iconBtn, "relative")}>
            <Bell className="h-5 w-5" strokeWidth={1.7} />
            {alerts.length > 0 && (
              <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-badge px-1 text-[0.65rem] font-semibold text-on-swatch">
                {alerts.length}
              </span>
            )}
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
            <div className="px-5 pt-4 pb-2 text-base font-medium">Notifications</div>
            {alerts.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                You're all caught up.
              </p>
            ) : (
              <ul className="max-h-80 overflow-y-auto pb-2">
                {alerts.map(({ task, group }) => {
                  const project = state.projects.find((p) => p.id === task.projectId);
                  return (
                    <li key={task.id} className="flex items-start">
                      <Link
                        to="/projects/$projectId"
                        params={{ projectId: task.projectId }}
                        search={{ task: task.id }}
                        className="block min-w-0 flex-1 px-5 py-3 hover:bg-muted"
                      >
                        <p className="text-sm font-medium text-foreground">{task.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          <span className={group === "overdue" ? "text-danger" : "text-primary"}>
                            {group === "overdue" ? "Overdue" : group === "today" ? "Due today" : "Assigned to you"}
                          </span>
                          {task.dueDate && ` · ${formatDue(task.dueDate)}`}
                          {project && ` · ${project.name}`}
                        </p>
                      </Link>
                      <button
                        aria-label={`Clear notification: ${task.title}`}
                        onClick={() => dismiss(alertKey(task.id, group, task.dueDate))}
                        className="m-2 shrink-0 rounded-full p-2 text-muted-foreground hover:bg-foreground/8 hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </PopoverContent>
        </Popover>

        <HelpMenu />
        <Link to="/settings" aria-label="Settings" className={iconBtn}>
          <Settings className="h-5 w-5" strokeWidth={1.7} />
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Account: ${me?.name ?? "you"}`}
            className="ml-1 flex h-10 w-10 items-center justify-center rounded-full hover:ring-4 hover:ring-foreground/8 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <UserAvatar user={me} decorative className="h-9 w-9 ring-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 rounded-3xl">
            <DropdownMenuLabel className="flex flex-col items-center gap-2 px-4 pt-3 pb-4 text-center">
              <UserAvatar user={me} decorative className="h-16 w-16 ring-0 [&_span]:text-lg" />
              <span className="text-base font-medium">Hi, {me?.name?.split(" ")[0]}!</span>
              <span className="text-xs font-normal text-muted-foreground">{me?.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {(account?.workspaces?.length ?? 0) > 1 && (
              <>
                {account!.workspaces.map((workspace) => (
                  <DropdownMenuItem
                    key={workspace.id}
                    disabled={workspace.id === account!.workspace.id}
                    onSelect={() => void switchWorkspace(workspace.id)}
                  >
                    {workspace.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem asChild>
              <Link to="/settings" search={{ section: "profile" }}>
                <UserRound className="mr-2 h-4 w-4" /> Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void signOut()}>
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

const iconBtn =
  "flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

function Brand() {
  const { users, currentUserId } = useAppState();
  const admin = users.find((u) => u.id === currentUserId)?.role === "Admin";
  return (
    <Link
      to={admin ? "/dashboard" : "/projects"}
      aria-label="Todobee home"
      className="flex items-center gap-2 rounded-full px-2 py-1"
    >
      <img src={beeLight.url} alt="" className="h-8 w-auto dark:hidden" />
      <img src={beeDark.url} alt="" className="hidden h-8 w-auto dark:block" />
      <span className="text-[1.375rem] font-semibold tracking-tight text-foreground max-[359px]:sr-only">
        Todobee
      </span>
    </Link>
  );
}

const HELP_EMAIL = "help@todobee.com";
const HELP_LINKS: { icon: typeof Home; text: string; subject: string }[] = [
  { icon: LifeBuoy, text: "Contact Support", subject: "Support Ticket" },
  { icon: MessageSquare, text: "Submit Feedback", subject: "User Feedback" },
  { icon: Bug, text: "Report Bug", subject: "Bug Report" },
];

function HelpMenu() {
  return (
    <Popover>
      <PopoverTrigger aria-label="Help" className={iconBtn}>
        <CircleHelp className="h-5 w-5" strokeWidth={1.7} />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="px-5 pt-4 pb-1 text-base font-medium">Help</div>
        <p className="px-5 pb-2 text-sm text-muted-foreground">A few ways to reach us.</p>
        <ul className="pb-3">
          {HELP_LINKS.map((t) => (
            <li key={t.text}>
              <a
                href={`mailto:${HELP_EMAIL}?subject=${encodeURIComponent(t.subject)}`}
                className="flex items-center gap-4 px-5 py-2.5 text-sm text-foreground hover:bg-foreground/8 focus-visible:bg-foreground/8 focus-visible:outline-none"
              >
                <t.icon className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.7} />
                {t.text}
              </a>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

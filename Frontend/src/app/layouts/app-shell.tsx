import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Radio,
  Truck,
  UserSquare2,
  Route as RouteIcon,
  Wrench,
  Fuel,
  BarChart3,
  Bell,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  Search,
  Bot,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { APP_NAME, ROLE_LABELS } from "@/lib/constants";
import { useAuth } from "@/lib/auth/auth-context";
import { can, type Module } from "@/lib/permissions";
import { AICopilotDrawer } from "@/features/ai-assistant/copilot-drawer";
import { useQuery } from "@tanstack/react-query";
import { driverApi, notificationApi, tripApi, vehicleApi } from "@/lib/api/services";
import { toast } from "sonner";

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  module: Module;
}

const NAV: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, module: "dashboard" },
  { label: "Live Operations", to: "/live-operations", icon: Radio, module: "live_operations" },
  { label: "Fleet", to: "/fleet", icon: Truck, module: "fleet" },
  { label: "Drivers", to: "/drivers", icon: UserSquare2, module: "drivers" },
  { label: "Trips", to: "/trips", icon: RouteIcon, module: "trips" },
  { label: "Maintenance", to: "/maintenance", icon: Wrench, module: "maintenance" },
  { label: "Fuel & Expenses", to: "/fuel-expenses", icon: Fuel, module: "fuel_expenses" },
  { label: "Analytics", to: "/analytics", icon: BarChart3, module: "analytics" },
  { label: "Notifications", to: "/notifications", icon: Bell, module: "notifications" },
  { label: "Settings", to: "/settings", icon: SettingsIcon, module: "settings" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const items = user ? NAV.filter((n) => can(user.role, n.module, "view")) : [];

  const notifQ = useQuery({
    queryKey: ["notifications"],
    queryFn: notificationApi.list,
    staleTime: 30_000,
  });
  const unread = notifQ.data?.filter((n) => !n.read).length ?? 0;
  const vehiclesQ = useQuery({ queryKey: ["vehicles"], queryFn: vehicleApi.list, enabled: !!user });
  const driversQ = useQuery({ queryKey: ["drivers"], queryFn: driverApi.list, enabled: !!user });
  const tripsQ = useQuery({ queryKey: ["trips"], queryFn: tripApi.list, enabled: !!user });

  function runSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = search.trim().toLowerCase();
    if (!q) return;
    const vehicle = vehiclesQ.data?.find(
      (v) =>
        v.registrationNumber.toLowerCase().includes(q) || v.modelName.toLowerCase().includes(q),
    );
    if (vehicle) {
      navigate({ to: "/fleet/$vehicleId", params: { vehicleId: vehicle.id } });
      setSearch("");
      return;
    }
    const driver = driversQ.data?.find(
      (d) =>
        d.fullName.toLowerCase().includes(q) ||
        d.licenceNumber.toLowerCase().includes(q) ||
        d.contactNumber.toLowerCase().includes(q),
    );
    if (driver) {
      navigate({ to: "/drivers/$driverId", params: { driverId: driver.id } });
      setSearch("");
      return;
    }
    const trip = tripsQ.data?.find(
      (t) =>
        t.tripNumber.toLowerCase().includes(q) ||
        t.source.toLowerCase().includes(q) ||
        t.destination.toLowerCase().includes(q),
    );
    if (trip) {
      navigate({ to: "/trips/$tripId", params: { tripId: trip.id } });
      setSearch("");
      return;
    }
    toast.info("No matching vehicle, driver or trip found.");
  }

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <SidebarBrand />
        <SidebarNav items={items} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
      </aside>

      {/* Sidebar (mobile drawer) */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-sidebar-foreground md:hidden">
            <div className="flex items-center justify-between border-b border-sidebar-border p-4">
              <SidebarBrand compact />
              <button
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-1 hover:bg-sidebar-accent"
              >
                <X className="size-4" />
              </button>
            </div>
            <SidebarNav items={items} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur md:px-6">
          <button
            className="rounded-md p-2 hover:bg-muted md:hidden"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" />
          </button>
          <form onSubmit={runSearch} className="relative hidden max-w-md flex-1 md:block">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vehicles, drivers, trips…"
              className="h-9 w-full rounded-md border bg-background pl-8 pr-3 text-sm focus:border-ring focus:outline-hidden focus:ring-2 focus:ring-ring/30"
            />
          </form>
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCopilotOpen(true)}
              className="hidden items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-sm font-medium hover:bg-muted sm:inline-flex"
            >
              <Bot className="size-4 text-brand" />
              Copilot
            </button>
            <Link
              to="/notifications"
              className="relative rounded-md p-2 hover:bg-muted"
              aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
            >
              <Bell className="size-5" />
              {unread > 0 && (
                <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
            {user && (
              <div className="ml-1 flex items-center gap-2 rounded-md border bg-background px-2 py-1">
                <div className="flex size-7 items-center justify-center rounded-full bg-brand text-xs font-semibold text-brand-foreground">
                  {user.name
                    .split(" ")
                    .map((s) => s[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div className="hidden text-xs leading-tight sm:block">
                  <div className="font-medium">{user.name}</div>
                  <div className="text-muted-foreground">{ROLE_LABELS[user.role]}</div>
                </div>
                <button
                  onClick={logout}
                  aria-label="Sign out"
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <LogOut className="size-4" />
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>

      <AICopilotDrawer open={copilotOpen} onClose={() => setCopilotOpen(false)} />
    </div>
  );
}

function SidebarBrand({ compact }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 border-b border-sidebar-border px-4",
        compact ? "" : "h-14",
      )}
    >
      <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Truck className="size-4" />
      </div>
      <div className="font-semibold tracking-tight">{APP_NAME}</div>
    </div>
  );
}

function SidebarNav({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <nav className="flex-1 overflow-y-auto p-2" aria-label="Primary">
      <ul className="space-y-0.5">
        {items.map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + "/");
          const Icon = item.icon;
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

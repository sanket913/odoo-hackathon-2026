import type { UserRole } from "@/types/domain";

export type Module =
  | "dashboard"
  | "live_operations"
  | "fleet"
  | "drivers"
  | "trips"
  | "maintenance"
  | "fuel_expenses"
  | "analytics"
  | "notifications"
  | "settings";

export type PermissionLevel = "none" | "view" | "create" | "edit" | "operate" | "admin";

const LEVELS: PermissionLevel[] = ["none", "view", "create", "edit", "operate", "admin"];

function rank(level: PermissionLevel): number {
  return LEVELS.indexOf(level);
}

const MATRIX: Record<UserRole, Record<Module, PermissionLevel>> = {
  admin: {
    dashboard: "admin",
    live_operations: "admin",
    fleet: "admin",
    drivers: "admin",
    trips: "admin",
    maintenance: "admin",
    fuel_expenses: "admin",
    analytics: "admin",
    notifications: "admin",
    settings: "admin",
  },
  fleet_manager: {
    dashboard: "view",
    live_operations: "view",
    fleet: "edit",
    drivers: "view",
    trips: "view",
    maintenance: "operate",
    fuel_expenses: "view",
    analytics: "view",
    notifications: "view",
    settings: "view",
  },
  dispatcher: {
    dashboard: "view",
    live_operations: "operate",
    fleet: "view",
    drivers: "view",
    trips: "operate",
    maintenance: "view",
    fuel_expenses: "create",
    analytics: "view",
    notifications: "view",
    settings: "none",
  },
  safety_officer: {
    dashboard: "view",
    live_operations: "view",
    fleet: "view",
    drivers: "operate",
    trips: "view",
    maintenance: "view",
    fuel_expenses: "none",
    analytics: "view",
    notifications: "view",
    settings: "none",
  },
  financial_analyst: {
    dashboard: "view",
    live_operations: "view",
    fleet: "view",
    drivers: "view",
    trips: "view",
    maintenance: "view",
    fuel_expenses: "operate",
    analytics: "operate",
    notifications: "view",
    settings: "none",
  },
};

export function can(role: UserRole, module: Module, required: PermissionLevel = "view"): boolean {
  const level = MATRIX[role]?.[module] ?? "none";
  if (level === "none") return false;
  return rank(level) >= rank(required);
}

export function getPermissionMatrix(): Record<UserRole, Record<Module, PermissionLevel>> {
  return MATRIX;
}

export const MODULES: Module[] = [
  "dashboard",
  "live_operations",
  "fleet",
  "drivers",
  "trips",
  "maintenance",
  "fuel_expenses",
  "analytics",
  "notifications",
  "settings",
];

export const MODULE_LABELS: Record<Module, string> = {
  dashboard: "Dashboard",
  live_operations: "Live Operations",
  fleet: "Fleet",
  drivers: "Drivers",
  trips: "Trips",
  maintenance: "Maintenance",
  fuel_expenses: "Fuel & Expenses",
  analytics: "Analytics",
  notifications: "Notifications",
  settings: "Settings",
};

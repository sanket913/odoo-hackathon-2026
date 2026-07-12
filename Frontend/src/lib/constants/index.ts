import type {
  UserRole,
  VehicleStatus,
  DriverStatus,
  TripStatus,
  MaintenanceStatus,
} from "@/types/domain";

export const APP_NAME = "TransitOps";
export const APP_TAGLINE = "Smart Transport Operations Platform";

export const LICENCE_WARN_DAYS = 30;

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  fleet_manager: "Fleet Manager",
  dispatcher: "Dispatcher",
  safety_officer: "Safety Officer",
  financial_analyst: "Financial Analyst",
};

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  available: "Available",
  on_trip: "On Trip",
  in_shop: "In Shop",
  retired: "Retired",
};

export const DRIVER_STATUS_LABELS: Record<DriverStatus, string> = {
  available: "Available",
  on_trip: "On Trip",
  off_duty: "Off Duty",
  suspended: "Suspended",
};

export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  draft: "Draft",
  dispatched: "Dispatched",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const VEHICLE_TYPES = ["van", "truck", "mini_truck", "trailer", "pickup"] as const;
export const VEHICLE_TYPE_LABELS: Record<string, string> = {
  van: "Van",
  truck: "Truck",
  mini_truck: "Mini Truck",
  trailer: "Trailer",
  pickup: "Pickup",
};

export const FUEL_TYPES = ["diesel", "petrol", "cng", "electric"] as const;
export const LICENCE_CATEGORIES = ["LMV", "HMV", "HGV", "PSV", "TRANS"] as const;

export const SERVICE_TYPES = [
  "oil_change",
  "tyre_replacement",
  "engine_repair",
  "brake_service",
  "battery_replacement",
  "general_inspection",
  "other",
] as const;

export const SERVICE_TYPE_LABELS: Record<string, string> = {
  oil_change: "Oil Change",
  tyre_replacement: "Tyre Replacement",
  engine_repair: "Engine Repair",
  brake_service: "Brake Service",
  battery_replacement: "Battery Replacement",
  general_inspection: "General Inspection",
  other: "Other",
};

export const EXPENSE_CATEGORIES = [
  "toll",
  "maintenance",
  "parking",
  "permit",
  "repair",
  "fine",
  "other",
] as const;
export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  toll: "Toll",
  maintenance: "Maintenance",
  parking: "Parking",
  permit: "Permit",
  repair: "Repair",
  fine: "Fine",
  other: "Other",
};

export const REGIONS = [
  { id: "north", name: "North", code: "N" },
  { id: "south", name: "South", code: "S" },
  { id: "east", name: "East", code: "E" },
  { id: "west", name: "West", code: "W" },
  { id: "central", name: "Central", code: "C" },
];

export const DEFAULT_MAP_CENTER: [number, number] = [23.2156, 72.6369]; // Gandhinagar

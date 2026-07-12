// Extended TransitOps types — added in Turn 1.
// New types kept in a separate file so the existing domain.ts stays untouched.

import type {
  Vehicle,
  Driver,
  Trip,
  Maintenance,
  UserRole,
  VehicleStatus,
  TripStatus,
  VehicleLocation,
  GeoPoint,
} from "./domain";

// ---------------------------------------------------------------------------
// Operational exceptions
// ---------------------------------------------------------------------------
export type ExceptionSeverity = "critical" | "high" | "medium" | "low";
export type ExceptionStatus = "open" | "resolved" | "dismissed";

export type ExceptionType =
  | "driver_licence_expired"
  | "driver_licence_expiring"
  | "driver_suspended"
  | "vehicle_service_overdue"
  | "vehicle_critical_health"
  | "vehicle_in_shop"
  | "cargo_capacity_conflict"
  | "trip_delayed"
  | "high_operational_cost"
  | "fuel_efficiency_decline"
  | "stale_vehicle_location"
  | "maintenance_overdue";

export type ExceptionEntity =
  | { type: "vehicle"; id: string; label: string }
  | { type: "driver"; id: string; label: string }
  | { type: "trip"; id: string; label: string }
  | { type: "maintenance"; id: string; label: string };

export interface CorrectiveAction {
  code:
    | "renew_licence"
    | "open_driver"
    | "create_maintenance"
    | "open_vehicle"
    | "reassign_trip"
    | "review_dispatch"
    | "add_location_update"
    | "view_cost_analysis"
    | "open_trip"
    | "open_maintenance";
  label: string;
  route?: string;
  params?: Record<string, string>;
}

export interface OperationalException {
  id: string;
  type: ExceptionType;
  severity: ExceptionSeverity;
  title: string;
  description: string;
  entity: ExceptionEntity;
  createdAt: string;
  status: ExceptionStatus;
  correctiveAction: CorrectiveAction;
  focusVehicleId?: string;
  focusTripId?: string;
}

// ---------------------------------------------------------------------------
// Operational timeline (Live Ops "recent events" feed)
// ---------------------------------------------------------------------------
export type OpsEventType =
  | "trip_created"
  | "trip_dispatched"
  | "trip_completed"
  | "trip_cancelled"
  | "vehicle_status_changed"
  | "driver_status_changed"
  | "maintenance_opened"
  | "maintenance_closed"
  | "fuel_logged"
  | "expense_added"
  | "exception_created";

export interface OpsTimelineEvent {
  id: string;
  type: OpsEventType;
  title: string;
  description: string;
  actor: string;
  at: string;
  entity?: ExceptionEntity;
}

// ---------------------------------------------------------------------------
// Decision / audit timeline (detail pages)
// ---------------------------------------------------------------------------
export interface ValidationSnapshot {
  vehicleAvailable: boolean;
  driverAvailable: boolean;
  licenceValid: boolean;
  capacityValid: boolean;
  noActiveMaintenance: boolean;
  noAssignmentConflict: boolean;
}

export interface AuditEvent {
  id: string;
  event: string;
  actor: string;
  actorRole?: UserRole;
  at: string;
  previousStatus?: string;
  newStatus?: string;
  validation?: ValidationSnapshot;
  reason?: string;
  relatedEntity?: ExceptionEntity;
  metadata?: Record<string, string>;
  requestId: string;
}

// ---------------------------------------------------------------------------
// Vehicle documents
// ---------------------------------------------------------------------------
export type VehicleDocumentType =
  "registration" | "insurance" | "pollution" | "fitness" | "permit" | "other";

export interface VehicleDocument {
  id: string;
  vehicleId: string;
  type: VehicleDocumentType;
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  notes?: string;
  uploadedAt: string;
}

export interface VehicleDocumentInput {
  type: VehicleDocumentType;
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Integrations
// ---------------------------------------------------------------------------
export type IntegrationId =
  | "backend_api"
  | "mysql"
  | "openstreetmap"
  | "routing_provider"
  | "groq_copilot"
  | "email_provider";

export type IntegrationStatusValue = "connected" | "disconnected" | "degraded" | "unknown";

export interface IntegrationStatus {
  id: IntegrationId;
  name: string;
  status: IntegrationStatusValue;
  lastCheckedAt: string;
  configurationSource: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Notification preferences
// ---------------------------------------------------------------------------
export interface NotificationPreferences {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  licenceReminderEnabled: boolean;
  licenceReminderDays: number;
  maintenanceReminderEnabled: boolean;
  maintenanceReminderDays: number;
  highCostAlertEnabled: boolean;
  highCostThreshold: number;
  fleetRiskAlertEnabled: boolean;
  fleetRiskThreshold: number;
  tripDelayAlertEnabled: boolean;
  tripDelayMinutes: number;
}

// ---------------------------------------------------------------------------
// Roles & permissions matrix
// ---------------------------------------------------------------------------
export type PermissionLevel =
  "none" | "view" | "create" | "edit" | "operate" | "approve" | "export" | "admin";

export const PERMISSION_LEVELS: PermissionLevel[] = [
  "none",
  "view",
  "create",
  "edit",
  "operate",
  "approve",
  "export",
  "admin",
];

export type PermissionModule =
  | "dashboard"
  | "live_operations"
  | "dispatch_intelligence"
  | "fleet"
  | "fleet_health"
  | "drivers"
  | "trips"
  | "maintenance"
  | "fuel_expenses"
  | "analytics"
  | "notifications"
  | "settings"
  | "documents"
  | "copilot";

export type PermissionMatrix = Record<UserRole, Record<PermissionModule, PermissionLevel>>;

// ---------------------------------------------------------------------------
// Master data (regions / vehicle types / licence categories)
// ---------------------------------------------------------------------------
export interface MasterDataItem {
  id: string;
  name: string;
  code: string;
  description?: string;
  active: boolean;
  usageCount?: number;
}

export interface MasterDataInput {
  name: string;
  code: string;
  description?: string;
  active?: boolean;
}

// ---------------------------------------------------------------------------
// Analytics filters & report options
// ---------------------------------------------------------------------------
export interface AnalyticsFilters {
  dateFrom?: string;
  dateTo?: string;
  vehicleId?: string;
  vehicleType?: string;
  region?: string;
  vehicleStatus?: string;
  tripStatus?: string;
}

export type ReportFormat = "csv" | "pdf";

export interface ReportRequest {
  format: ReportFormat;
  filters: AnalyticsFilters;
  scope: "summary" | "vehicles" | "trends" | "trips";
}

export interface ReportBlob {
  fileName: string;
  mimeType: string;
  content: string; // base64 or plain text for CSV
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Trends / distributions
// ---------------------------------------------------------------------------
export interface TrendPoint {
  label: string;
  value: number;
}
export interface DistributionSlice {
  label: string;
  value: number;
}
export interface RegionPerformance {
  region: string;
  revenue: number;
  cost: number;
  trips: number;
  utilization: number;
}
export interface DriverSafetyBucket {
  bucket: string;
  count: number;
}

// ---------------------------------------------------------------------------
// Global search
// ---------------------------------------------------------------------------
export type SearchEntityType = "vehicle" | "driver" | "trip" | "maintenance" | "notification";

export interface SearchResult {
  type: SearchEntityType;
  id: string;
  label: string;
  description?: string;
  status?: string;
  route: string;
}

// ---------------------------------------------------------------------------
// Copilot context
// ---------------------------------------------------------------------------
export type CopilotContextScope =
  | "dashboard"
  | "live_operations"
  | "dispatch_intelligence"
  | "fleet"
  | "vehicle_detail"
  | "fleet_health"
  | "driver_detail"
  | "trip_detail"
  | "maintenance_detail"
  | "fuel_expenses"
  | "analytics"
  | "settings"
  | "notifications";

export interface CopilotContext {
  scope: CopilotContextScope;
  route: string;
  entityId?: string;
  entityLabel?: string;
  chips: string[];
}

export interface CopilotSuggestion {
  id: string;
  prompt: string;
}

// ---------------------------------------------------------------------------
// Live Ops helper types
// ---------------------------------------------------------------------------
export interface LiveTripProgress {
  tripId: string;
  progressPercent: number;
  currentCoords?: GeoPoint;
  etaAt?: string;
  lastUpdateAt: string;
  riskLevel: "low" | "medium" | "high";
}

export interface LiveOpsFilters {
  search?: string;
  status?: TripStatus | "all";
  region?: string | "all";
  risk?: "all" | "low" | "medium" | "high";
  vehicleType?: string | "all";
}

// Re-export helpers to keep imports tidy in feature files.
export type { Vehicle, Driver, Trip, Maintenance, VehicleStatus, VehicleLocation };

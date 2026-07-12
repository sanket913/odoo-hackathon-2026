import { cn } from "@/lib/utils";
import type { VehicleStatus, DriverStatus, TripStatus, MaintenanceStatus } from "@/types/domain";
import {
  VEHICLE_STATUS_LABELS,
  DRIVER_STATUS_LABELS,
  TRIP_STATUS_LABELS,
  MAINTENANCE_STATUS_LABELS,
} from "@/lib/constants";

type Tone = "available" | "active" | "warning" | "critical" | "neutral";

const TONE_CLASS: Record<Tone, string> = {
  available: "bg-status-available text-status-available-foreground",
  active: "bg-status-active text-status-active-foreground",
  warning: "bg-status-warning text-status-warning-foreground",
  critical: "bg-status-critical text-status-critical-foreground",
  neutral: "bg-status-neutral text-status-neutral-foreground",
};

function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium tabular whitespace-nowrap",
        TONE_CLASS[tone],
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden />
      {children}
    </span>
  );
}

const VEHICLE_TONE: Record<VehicleStatus, Tone> = {
  available: "available",
  on_trip: "active",
  in_shop: "warning",
  retired: "critical",
};
const DRIVER_TONE: Record<DriverStatus, Tone> = {
  available: "available",
  on_trip: "active",
  off_duty: "neutral",
  suspended: "critical",
};
const TRIP_TONE: Record<TripStatus, Tone> = {
  draft: "neutral",
  dispatched: "active",
  completed: "available",
  cancelled: "critical",
};
const MAINT_TONE: Record<MaintenanceStatus, Tone> = {
  open: "warning",
  in_progress: "active",
  completed: "available",
  cancelled: "neutral",
};

export function VehicleStatusBadge({ status }: { status: VehicleStatus }) {
  return <Badge tone={VEHICLE_TONE[status]}>{VEHICLE_STATUS_LABELS[status]}</Badge>;
}
export function DriverStatusBadge({ status }: { status: DriverStatus }) {
  return <Badge tone={DRIVER_TONE[status]}>{DRIVER_STATUS_LABELS[status]}</Badge>;
}
export function TripStatusBadge({ status }: { status: TripStatus }) {
  return <Badge tone={TRIP_TONE[status]}>{TRIP_STATUS_LABELS[status]}</Badge>;
}
export function MaintenanceStatusBadge({ status }: { status: MaintenanceStatus }) {
  return <Badge tone={MAINT_TONE[status]}>{MAINTENANCE_STATUS_LABELS[status]}</Badge>;
}

export function LicenceBadge({ daysLeft }: { daysLeft: number | null }) {
  if (daysLeft == null) return <Badge tone="neutral">Unknown</Badge>;
  if (daysLeft <= 0) return <Badge tone="critical">Expired</Badge>;
  if (daysLeft <= 30) return <Badge tone="warning">Expiring in {daysLeft}d</Badge>;
  return <Badge tone="available">Valid</Badge>;
}

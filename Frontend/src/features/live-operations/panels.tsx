import { Link } from "@tanstack/react-router";
import { TripStatusBadge } from "@/components/common/status-badges";
import { Button } from "@/components/ui/button";
import { AlertTriangle, MapPin, ExternalLink, Check, X } from "lucide-react";
import { formatDateTime } from "@/lib/utils/format";
import type { EnrichedTrip } from "./utils";
import type { OperationalException, OpsTimelineEvent } from "@/types/domain-extended";
import type { VehicleLocation, Vehicle, Driver } from "@/types/domain";
import {
  SEVERITY_COLOR,
  SEVERITY_LABEL,
  riskBadgeClass,
  riskLabel,
  formatRelativeMinutes,
} from "./utils";

// ---------------------------------------------------------------------------
// Active trip card
// ---------------------------------------------------------------------------
export function ActiveTripCard({
  enriched,
  active,
  onSelect,
  onFocus,
}: {
  enriched: EnrichedTrip;
  active: boolean;
  onSelect: () => void;
  onFocus: () => void;
}) {
  const { trip, vehicle, driver, progress } = enriched;
  return (
    <div
      className={`rounded-md border p-3 text-sm transition-colors ${active ? "border-primary bg-accent" : "hover:bg-muted/40"}`}
    >
      <button className="block w-full text-left" onClick={onSelect}>
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium">{trip.tripNumber}</span>
          <TripStatusBadge status={trip.status} />
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {trip.source} → {trip.destination}
        </div>
        <div className="mt-1 text-xs">
          {vehicle?.registrationNumber ?? "—"} · {driver?.fullName ?? "—"}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary" style={{ width: `${progress.progressPercent}%` }} />
          </div>
          <span className="text-[11px] tabular text-muted-foreground">
            {progress.progressPercent}%
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            {trip.plannedDistanceKm}km ·{" "}
            {progress.etaAt
              ? `ETA ${new Date(progress.etaAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
              : "ETA —"}
          </span>
          <span className={`rounded-full px-1.5 py-0.5 ${riskBadgeClass(progress.riskLevel)}`}>
            {riskLabel(progress.riskLevel)}
          </span>
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">
          Updated {formatRelativeMinutes(progress.lastUpdateAt)}
        </div>
      </button>
      <div className="mt-2 flex gap-1">
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onFocus}>
          <MapPin className="mr-1 size-3" /> Focus
        </Button>
        <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
          <Link to="/trips/$tripId" params={{ tripId: trip.id }}>
            <ExternalLink className="mr-1 size-3" /> Open
          </Link>
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exception card
// ---------------------------------------------------------------------------
export function ExceptionCard({
  exception,
  onFocusMap,
  onResolve,
  onDismiss,
  onNavigate,
}: {
  exception: OperationalException;
  onFocusMap?: () => void;
  onResolve: () => void;
  onDismiss: () => void;
  onNavigate: () => void;
}) {
  const canFocusMap = !!(exception.focusVehicleId ?? exception.focusTripId);
  return (
    <div className="rounded-md border bg-card p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-muted-foreground" />
          <span className="font-medium">{exception.title}</span>
        </div>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${SEVERITY_COLOR[exception.severity]}`}
        >
          {SEVERITY_LABEL[exception.severity]}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{exception.description}</p>
      <div className="mt-1 text-[11px] text-muted-foreground">
        {exception.entity.label} · {formatRelativeMinutes(exception.createdAt)}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {canFocusMap && (
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onFocusMap}>
            <MapPin className="mr-1 size-3" /> Focus
          </Button>
        )}
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onNavigate}>
          <ExternalLink className="mr-1 size-3" />
          {exception.correctiveAction.label}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onResolve}>
          <Check className="mr-1 size-3" /> Resolve
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onDismiss}>
          <X className="mr-1 size-3" /> Dismiss
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vehicle row (Vehicles tab)
// ---------------------------------------------------------------------------
export function VehicleRow({
  location,
  vehicle,
  driver,
  onFocus,
}: {
  location: VehicleLocation;
  vehicle?: Vehicle;
  driver?: Driver;
  onFocus: () => void;
}) {
  return (
    <div className="rounded-md border p-3 text-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">{location.registrationNumber}</div>
          <div className="text-xs text-muted-foreground">
            {vehicle?.modelName} · {vehicle?.region ?? "—"}
          </div>
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">
          {location.status.replace("_", " ")}
        </span>
      </div>
      <div className="mt-1 text-xs">
        Driver: {driver?.fullName ?? "—"}
        {location.tripId && ` · Trip: ${location.tripId}`}
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">
        {location.speedKph != null ? `${location.speedKph} km/h · ` : ""}
        Updated {formatRelativeMinutes(location.updatedAt)}
      </div>
      <div className="mt-2 flex gap-1">
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onFocus}>
          <MapPin className="mr-1 size-3" /> Focus
        </Button>
        {vehicle && (
          <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
            <Link to="/fleet/$vehicleId" params={{ vehicleId: vehicle.id }}>
              <ExternalLink className="mr-1 size-3" /> Open
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Timeline row
// ---------------------------------------------------------------------------
export function TimelineRow({ event }: { event: OpsTimelineEvent }) {
  return (
    <div className="flex gap-3 border-l-2 border-muted pl-3">
      <div className="flex-1">
        <div className="text-sm font-medium">{event.title}</div>
        <div className="text-xs text-muted-foreground">{event.description}</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">
          {event.actor} · {formatDateTime(event.at)}
        </div>
      </div>
    </div>
  );
}

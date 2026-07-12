import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { TripStatusBadge } from "@/components/common/status-badges";
import type { EnrichedTrip } from "./utils";
import { riskBadgeClass, riskLabel, formatRelativeMinutes } from "./utils";
import { formatDateTime } from "@/lib/utils/format";
import { MapPin, Fuel, Receipt, X, CheckCircle2, PlayCircle } from "lucide-react";

interface Props {
  enriched: EnrichedTrip | null;
  onClose: () => void;
  onFocusMap: (vehicleId: string) => void;
  onComplete?: (tripId: string) => void;
  onCancel?: (tripId: string) => void;
  canOperate: boolean;
}

export function TripDetailDrawer({
  enriched,
  onClose,
  onFocusMap,
  onComplete,
  onCancel,
  canOperate,
}: Props) {
  const open = !!enriched;
  const t = enriched?.trip;
  const v = enriched?.vehicle;
  const d = enriched?.driver;
  const p = enriched?.progress;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full max-w-md overflow-y-auto sm:max-w-lg">
        {t && p && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                {t.tripNumber}
                <TripStatusBadge status={t.status} />
                <span
                  className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${riskBadgeClass(p.riskLevel)}`}
                >
                  {riskLabel(p.riskLevel)}
                </span>
              </SheetTitle>
            </SheetHeader>

            <div className="mt-4 space-y-4 text-sm">
              <section>
                <div className="text-xs font-medium uppercase text-muted-foreground">Route</div>
                <div className="mt-1 font-medium">
                  {t.source} → {t.destination}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t.plannedDistanceKm} km planned · Dispatched {formatDateTime(t.dispatchedAt)}
                </div>
              </section>

              <section className="grid grid-cols-2 gap-3">
                <InfoCell label="Vehicle" value={v?.registrationNumber ?? "—"} sub={v?.modelName} />
                <InfoCell label="Driver" value={d?.fullName ?? "—"} sub={d?.contactNumber} />
                <InfoCell label="Cargo" value={`${t.cargoWeightKg} kg`} sub={t.cargoDescription} />
                <InfoCell
                  label="Capacity"
                  value={v ? `${v.maxCapacityKg} kg` : "—"}
                  sub={
                    v
                      ? `${Math.round((t.cargoWeightKg / v.maxCapacityKg) * 100)}% utilised`
                      : undefined
                  }
                />
                <InfoCell
                  label="Progress"
                  value={`${p.progressPercent}%`}
                  sub={p.etaAt ? `ETA ${formatDateTime(p.etaAt)}` : undefined}
                />
                <InfoCell
                  label="Current location"
                  value={
                    p.currentCoords
                      ? `${p.currentCoords.lat.toFixed(3)}, ${p.currentCoords.lng.toFixed(3)}`
                      : "Unknown"
                  }
                  sub={`Updated ${formatRelativeMinutes(p.lastUpdateAt)}`}
                />
              </section>

              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${p.progressPercent}%` }}
                />
              </div>

              <section>
                <div className="text-xs font-medium uppercase text-muted-foreground">
                  Decision audit preview
                </div>
                <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                  <li>Trip created {formatDateTime(t.createdAt)}</li>
                  {t.dispatchedAt && <li>Dispatched {formatDateTime(t.dispatchedAt)}</li>}
                  {t.completedAt && <li>Completed {formatDateTime(t.completedAt)}</li>}
                </ul>
              </section>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button asChild size="sm">
                  <Link to="/trips/$tripId" params={{ tripId: t.id }}>
                    Open full trip
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => v && onFocusMap(v.id)}
                  disabled={!v}
                >
                  <MapPin className="mr-1 size-3.5" />
                  Focus on map
                </Button>
                {canOperate && t.status === "dispatched" && onComplete && (
                  <Button size="sm" variant="outline" onClick={() => onComplete(t.id)}>
                    <CheckCircle2 className="mr-1 size-3.5" />
                    Complete
                  </Button>
                )}
                {canOperate && t.status !== "completed" && t.status !== "cancelled" && onCancel && (
                  <Button size="sm" variant="outline" onClick={() => onCancel(t.id)}>
                    <X className="mr-1 size-3.5" />
                    Cancel
                  </Button>
                )}
                <Button asChild size="sm" variant="outline">
                  <Link to="/fuel-expenses">
                    <Fuel className="mr-1 size-3.5" /> Add fuel
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to="/fuel-expenses">
                    <Receipt className="mr-1 size-3.5" /> Add expense
                  </Link>
                </Button>
                {v && (
                  <Button asChild size="sm" variant="ghost">
                    <Link to="/fleet/$vehicleId" params={{ vehicleId: v.id }}>
                      <PlayCircle className="mr-1 size-3.5" /> Open vehicle
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function InfoCell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-md border bg-card p-2">
      <div className="text-[10px] font-medium uppercase text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

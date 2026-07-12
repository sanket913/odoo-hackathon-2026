import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tripApi, vehicleApi, driverApi } from "@/lib/api/services";
import { PageHeader, ErrorState } from "@/components/common/states";
import { TripStatusBadge } from "@/components/common/status-badges";
import { formatDateTime, formatNumber, formatCurrency } from "@/lib/utils/format";
import { ApiRuleError } from "@/lib/api/client";
import { toast } from "sonner";
import type { TripStatus } from "@/types/domain";

export const Route = createFileRoute("/_authenticated/trips/$tripId")({
  head: () => ({ meta: [{ title: "Trip — TransitOps" }] }),
  component: TripDetailPage,
});

const STEPS: TripStatus[] = ["draft", "dispatched", "completed"];

function TripDetailPage() {
  const { tripId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const tQ = useQuery({ queryKey: ["trip", tripId], queryFn: () => tripApi.get(tripId) });
  const vQ = useQuery({ queryKey: ["vehicles"], queryFn: vehicleApi.list });
  const dQ = useQuery({ queryKey: ["drivers"], queryFn: driverApi.list });

  const [showComplete, setShowComplete] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [complete, setComplete] = useState({
    finalOdometerKm: 0,
    fuelConsumedLitres: 0,
    fuelCost: 0,
    additionalExpense: 0,
    notes: "",
  });

  const dispatchMut = useMutation({
    mutationFn: () => tripApi.dispatch(tripId),
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Trip dispatched");
    },
    onError: (e) => toast.error(e instanceof ApiRuleError ? e.message : "Dispatch failed"),
  });
  const completeMut = useMutation({
    mutationFn: () => tripApi.complete(tripId, complete),
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Trip completed");
      setShowComplete(false);
    },
    onError: (e) => toast.error(e instanceof ApiRuleError ? e.message : "Complete failed"),
  });
  const cancelMut = useMutation({
    mutationFn: () => tripApi.cancel(tripId, cancelReason),
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Trip cancelled");
      setShowCancel(false);
    },
    onError: (e) => toast.error(e instanceof ApiRuleError ? e.message : "Cancel failed"),
  });

  if (tQ.isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (tQ.error || !tQ.data) return <ErrorState onRetry={() => tQ.refetch()} />;
  const t = tQ.data;
  const veh = vQ.data?.find((x) => x.id === t.vehicleId);
  const drv = dQ.data?.find((x) => x.id === t.driverId);
  const currentStepIdx = t.status === "cancelled" ? -1 : STEPS.indexOf(t.status);

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {t.tripNumber} <TripStatusBadge status={t.status} />
          </span>
        }
        description={`${t.source} → ${t.destination}`}
        actions={
          <div className="flex gap-2">
            {t.status === "draft" && (
              <button
                onClick={() => dispatchMut.mutate()}
                disabled={dispatchMut.isPending}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                Dispatch
              </button>
            )}
            {t.status === "dispatched" && (
              <button
                onClick={() => {
                  setComplete({ ...complete, finalOdometerKm: t.startingOdometerKm ?? 0 });
                  setShowComplete(true);
                }}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
              >
                Complete
              </button>
            )}
            {(t.status === "draft" || t.status === "dispatched") && (
              <button
                onClick={() => setShowCancel(true)}
                className="rounded-md border border-destructive/40 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10"
              >
                Cancel
              </button>
            )}
            <button
              onClick={() => navigate({ to: "/trips" })}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
            >
              Back
            </button>
          </div>
        }
      />

      {/* Stepper */}
      <ol className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2">
            <div
              className={`size-7 rounded-full text-xs font-semibold grid place-items-center ${i <= currentStepIdx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              {i + 1}
            </div>
            <span
              className={`text-sm ${i <= currentStepIdx ? "font-medium" : "text-muted-foreground"} capitalize`}
            >
              {s}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 ${i < currentStepIdx ? "bg-primary" : "bg-muted"}`} />
            )}
          </li>
        ))}
        {t.status === "cancelled" && <li className="text-sm text-destructive">Cancelled</li>}
      </ol>

      <div className="grid gap-4 md:grid-cols-4">
        <Info label="Vehicle" value={veh?.registrationNumber ?? "—"} />
        <Info label="Driver" value={drv?.fullName ?? "—"} />
        <Info
          label="Cargo"
          value={`${formatNumber(t.cargoWeightKg)} kg / ${formatNumber(veh?.maxCapacityKg ?? 0)} kg`}
        />
        <Info label="Planned distance" value={`${formatNumber(t.plannedDistanceKm)} km`} />
        <Info
          label="Actual distance"
          value={t.actualDistanceKm != null ? `${formatNumber(t.actualDistanceKm)} km` : "—"}
        />
        <Info label="Fuel cost" value={formatCurrency(t.fuelCost ?? 0)} />
        <Info label="Expected revenue" value={formatCurrency(t.expectedRevenue)} />
        <Info label="Planned departure" value={formatDateTime(t.plannedDepartureAt)} />
      </div>

      {t.cancellationReason && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <strong>Cancellation reason:</strong> {t.cancellationReason}
        </div>
      )}

      {showComplete && (
        <Modal onClose={() => setShowComplete(false)} title="Complete Trip">
          <div className="grid gap-3 md:grid-cols-2">
            <L label={`Starting odometer (${formatNumber(t.startingOdometerKm ?? 0)} km)`}>
              <input disabled value={t.startingOdometerKm ?? 0} className={inp + " opacity-60"} />
            </L>
            <L label="Final odometer">
              <input
                type="number"
                min={t.startingOdometerKm ?? 0}
                value={complete.finalOdometerKm}
                onChange={(e) =>
                  setComplete({ ...complete, finalOdometerKm: Number(e.target.value) })
                }
                className={inp}
              />
            </L>
            <L label="Fuel consumed (L)">
              <input
                type="number"
                min={0}
                value={complete.fuelConsumedLitres}
                onChange={(e) =>
                  setComplete({ ...complete, fuelConsumedLitres: Number(e.target.value) })
                }
                className={inp}
              />
            </L>
            <L label="Fuel cost">
              <input
                type="number"
                min={0}
                value={complete.fuelCost}
                onChange={(e) => setComplete({ ...complete, fuelCost: Number(e.target.value) })}
                className={inp}
              />
            </L>
            <L label="Additional expense">
              <input
                type="number"
                min={0}
                value={complete.additionalExpense}
                onChange={(e) =>
                  setComplete({ ...complete, additionalExpense: Number(e.target.value) })
                }
                className={inp}
              />
            </L>
            <L label="Notes" full>
              <textarea
                value={complete.notes}
                onChange={(e) => setComplete({ ...complete, notes: e.target.value })}
                rows={2}
                className={inp}
              />
            </L>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setShowComplete(false)}
              className="rounded-md border px-3 py-1.5 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => completeMut.mutate()}
              disabled={completeMut.isPending}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              Complete trip
            </button>
          </div>
        </Modal>
      )}

      {showCancel && (
        <Modal onClose={() => setShowCancel(false)} title="Cancel Trip">
          <p className="text-sm text-muted-foreground">
            The vehicle and driver will become available again if this trip was dispatched.
          </p>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={3}
            className={inp + " mt-3"}
            placeholder="Reason for cancellation (required)"
          />
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setShowCancel(false)}
              className="rounded-md border px-3 py-1.5 text-sm"
            >
              Keep trip
            </button>
            <button
              onClick={() => cancelMut.mutate()}
              disabled={cancelMut.isPending || !cancelReason.trim()}
              className="rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground disabled:opacity-60"
            >
              Cancel trip
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

const inp = "h-10 w-full rounded-md border bg-background px-3 text-sm";

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular">{value}</div>
    </div>
  );
}
function L({
  label,
  full,
  children,
}: {
  label: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <label className="text-sm font-medium">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div
        role="dialog"
        aria-label={title}
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-6 shadow-xl"
      >
        <h3 className="mb-3 text-lg font-semibold">{title}</h3>
        {children}
      </div>
    </>
  );
}

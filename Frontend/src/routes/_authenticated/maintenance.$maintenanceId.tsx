import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { maintenanceApi, vehicleApi } from "@/lib/api/services";
import { PageHeader, ErrorState } from "@/components/common/states";
import { MaintenanceStatusBadge } from "@/components/common/status-badges";
import { SERVICE_TYPE_LABELS } from "@/lib/constants";
import { formatDate, formatCurrency } from "@/lib/utils/format";
import { toast } from "sonner";
import { ApiRuleError } from "@/lib/api/client";

export const Route = createFileRoute("/_authenticated/maintenance/$maintenanceId")({
  head: () => ({ meta: [{ title: "Maintenance — TransitOps" }] }),
  component: MaintenanceDetailPage,
});

function MaintenanceDetailPage() {
  const { maintenanceId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const mQ = useQuery({
    queryKey: ["maintenance", maintenanceId],
    queryFn: () => maintenanceApi.get(maintenanceId),
  });
  const vQ = useQuery({ queryKey: ["vehicles"], queryFn: vehicleApi.list });

  const [showClose, setShowClose] = useState(false);
  const [closeVals, setCloseVals] = useState({
    finalCost: 0,
    workPerformed: "",
    completionDate: new Date().toISOString().slice(0, 10),
    nextServiceDate: "",
    nextServiceOdometerKm: 0,
    returnToAvailable: true,
  });

  const closeMut = useMutation({
    mutationFn: () =>
      maintenanceApi.close(maintenanceId, {
        ...closeVals,
        completionDate: new Date(closeVals.completionDate).toISOString(),
        nextServiceDate: closeVals.nextServiceDate
          ? new Date(closeVals.nextServiceDate).toISOString()
          : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Maintenance closed — vehicle back to Available.");
      setShowClose(false);
    },
    onError: (e) => toast.error(e instanceof ApiRuleError ? e.message : "Failed"),
  });

  if (mQ.isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (mQ.error || !mQ.data) return <ErrorState onRetry={() => mQ.refetch()} />;
  const m = mQ.data;
  const veh = vQ.data?.find((v) => v.id === m.vehicleId);
  const isRetired = veh?.status === "retired";

  const inp = "h-10 w-full rounded-md border bg-background px-3 text-sm";

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {m.maintenanceNumber} <MaintenanceStatusBadge status={m.status} />
          </span>
        }
        description={`${veh?.registrationNumber ?? "—"} · ${SERVICE_TYPE_LABELS[m.serviceType]}`}
        actions={
          <div className="flex gap-2">
            {(m.status === "open" || m.status === "in_progress") && (
              <button
                onClick={() => {
                  setCloseVals({ ...closeVals, finalCost: m.cost });
                  setShowClose(true);
                }}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
              >
                Close maintenance
              </button>
            )}
            <button
              onClick={() => navigate({ to: "/maintenance" })}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
            >
              Back
            </button>
          </div>
        }
      />
      <div className="grid gap-4 md:grid-cols-4">
        <Info label="Priority" value={<span className="capitalize">{m.priority}</span>} />
        <Info label="Start" value={formatDate(m.startDate)} />
        <Info label="Expected completion" value={formatDate(m.expectedCompletionDate)} />
        <Info label="Cost" value={formatCurrency(m.finalCost ?? m.cost)} />
        <Info label="Provider" value={m.serviceProvider || "—"} />
        <Info label="Odometer at service" value={m.odometerAtService} />
        <Info label="Completion date" value={formatDate(m.completionDate)} />
        <Info label="Next service" value={formatDate(m.nextServiceDate)} />
      </div>
      {m.description && (
        <div className="rounded-lg border bg-card p-4 text-sm">
          <strong className="mb-1 block">Description</strong>
          {m.description}
        </div>
      )}
      {m.workPerformed && (
        <div className="rounded-lg border bg-card p-4 text-sm">
          <strong className="mb-1 block">Work performed</strong>
          {m.workPerformed}
        </div>
      )}

      {showClose && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowClose(false)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-6 shadow-xl">
            <h3 className="mb-3 text-lg font-semibold">Close Maintenance</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <L label="Completion date">
                <input
                  type="date"
                  value={closeVals.completionDate}
                  onChange={(e) => setCloseVals({ ...closeVals, completionDate: e.target.value })}
                  className={inp}
                />
              </L>
              <L label="Final cost">
                <input
                  type="number"
                  min={0}
                  value={closeVals.finalCost}
                  onChange={(e) =>
                    setCloseVals({ ...closeVals, finalCost: Number(e.target.value) })
                  }
                  className={inp}
                />
              </L>
              <L label="Next service date">
                <input
                  type="date"
                  value={closeVals.nextServiceDate}
                  onChange={(e) => setCloseVals({ ...closeVals, nextServiceDate: e.target.value })}
                  className={inp}
                />
              </L>
              <L label="Next service odometer">
                <input
                  type="number"
                  min={0}
                  value={closeVals.nextServiceOdometerKm}
                  onChange={(e) =>
                    setCloseVals({ ...closeVals, nextServiceOdometerKm: Number(e.target.value) })
                  }
                  className={inp}
                />
              </L>
              <L label="Work performed" full>
                <textarea
                  value={closeVals.workPerformed}
                  onChange={(e) => setCloseVals({ ...closeVals, workPerformed: e.target.value })}
                  rows={3}
                  className={inp}
                />
              </L>
              <label className="md:col-span-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={closeVals.returnToAvailable && !isRetired}
                  disabled={isRetired}
                  onChange={(e) =>
                    setCloseVals({ ...closeVals, returnToAvailable: e.target.checked })
                  }
                />
                Return vehicle to Available{" "}
                {isRetired && (
                  <span className="text-xs text-destructive">(vehicle is retired)</span>
                )}
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowClose(false)}
                className="rounded-md border px-3 py-1.5 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => closeMut.mutate()}
                disabled={closeMut.isPending}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

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

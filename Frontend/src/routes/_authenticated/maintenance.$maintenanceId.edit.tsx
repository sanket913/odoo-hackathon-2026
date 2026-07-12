import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { maintenanceApi, vehicleApi } from "@/lib/api/services";
import { PageHeader, ErrorState } from "@/components/common/states";
import { SERVICE_TYPE_LABELS } from "@/lib/constants";
import { ApiRuleError } from "@/lib/api/client";
import { toast } from "sonner";
import { invalidateMaintenanceDomain } from "@/lib/invalidation";
import { queryKeys } from "@/lib/query-keys";
import type { MaintenancePriority, ServiceType } from "@/types/domain";

export const Route = createFileRoute("/_authenticated/maintenance/$maintenanceId/edit")({
  head: () => ({ meta: [{ title: "Edit maintenance - TransitOps" }] }),
  component: EditMaintenancePage,
});

function EditMaintenancePage() {
  const { maintenanceId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const mQ = useQuery({
    queryKey: ["maintenance", maintenanceId],
    queryFn: () => maintenanceApi.get(maintenanceId),
  });
  const vQ = useQuery({ queryKey: queryKeys.vehicles, queryFn: vehicleApi.list });
  const [form, setForm] = useState({
    vehicleId: "",
    serviceType: "general_inspection" as ServiceType,
    description: "",
    priority: "medium" as MaintenancePriority,
    startDate: "",
    expectedCompletionDate: "",
    cost: 0,
    serviceProvider: "",
    odometerAtService: 0,
    notes: "",
  });

  useEffect(() => {
    const m = mQ.data;
    if (!m) return;
    setForm({
      vehicleId: m.vehicleId,
      serviceType: m.serviceType,
      description: m.description,
      priority: m.priority,
      startDate: m.startDate.slice(0, 10),
      expectedCompletionDate: m.expectedCompletionDate.slice(0, 10),
      cost: m.cost,
      serviceProvider: m.serviceProvider,
      odometerAtService: m.odometerAtService,
      notes: m.notes ?? "",
    });
  }, [mQ.data]);

  const mut = useMutation({
    mutationFn: () =>
      maintenanceApi.update(maintenanceId, {
        ...form,
        startDate: new Date(form.startDate).toISOString(),
        expectedCompletionDate: new Date(form.expectedCompletionDate).toISOString(),
      }),
    onSuccess: () => {
      invalidateMaintenanceDomain(qc);
      qc.invalidateQueries({ queryKey: ["maintenance", maintenanceId] });
      toast.success("Maintenance updated");
      navigate({ to: "/maintenance/$maintenanceId", params: { maintenanceId } });
    },
    onError: (e) =>
      toast.error(e instanceof ApiRuleError ? e.message : "Failed to update maintenance"),
  });

  if (mQ.isLoading) return <div className="text-sm text-muted-foreground">Loading...</div>;
  if (mQ.error || !mQ.data) return <ErrorState onRetry={() => mQ.refetch()} />;
  if (mQ.data.status === "completed" || mQ.data.status === "cancelled") {
    return (
      <ErrorState
        title="Maintenance cannot be edited"
        description="Closed maintenance records are read-only."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Edit Maintenance" description={mQ.data.maintenanceNumber} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mut.mutate();
        }}
        className="grid gap-6 lg:grid-cols-3"
      >
        <div className="rounded-lg border bg-card p-6 space-y-4 lg:col-span-2">
          <div className="grid gap-4 md:grid-cols-2">
            <F label="Vehicle">
              <select
                value={form.vehicleId}
                onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
                className={inp}
                required
              >
                {vQ.data?.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registrationNumber}
                  </option>
                ))}
              </select>
            </F>
            <F label="Service type">
              <select
                value={form.serviceType}
                onChange={(e) => setForm({ ...form, serviceType: e.target.value as ServiceType })}
                className={inp}
              >
                {Object.entries(SERVICE_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </F>
            <F label="Priority">
              <select
                value={form.priority}
                onChange={(e) =>
                  setForm({ ...form, priority: e.target.value as MaintenancePriority })
                }
                className={inp}
              >
                {(["low", "medium", "high", "critical"] as const).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </F>
            <F label="Cost">
              <input
                type="number"
                min={0}
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })}
                className={inp}
              />
            </F>
            <F label="Start date">
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className={inp}
              />
            </F>
            <F label="Expected completion">
              <input
                type="date"
                value={form.expectedCompletionDate}
                onChange={(e) => setForm({ ...form, expectedCompletionDate: e.target.value })}
                className={inp}
              />
            </F>
            <F label="Service provider">
              <input
                value={form.serviceProvider}
                onChange={(e) => setForm({ ...form, serviceProvider: e.target.value })}
                className={inp}
              />
            </F>
            <F label="Odometer at service">
              <input
                type="number"
                min={0}
                value={form.odometerAtService}
                onChange={(e) => setForm({ ...form, odometerAtService: Number(e.target.value) })}
                className={inp}
              />
            </F>
          </div>
          <F label="Description">
            <textarea
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </F>
          <F label="Notes">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </F>
        </div>
        <div className="rounded-lg border bg-card p-6 h-fit space-y-3">
          <button
            type="submit"
            disabled={mut.isPending}
            className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            Save changes
          </button>
          <button
            type="button"
            onClick={() =>
              navigate({ to: "/maintenance/$maintenanceId", params: { maintenanceId } })
            }
            className="w-full rounded-md border px-3 py-2 text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

const inp = "h-10 w-full rounded-md border bg-background px-3 text-sm";

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

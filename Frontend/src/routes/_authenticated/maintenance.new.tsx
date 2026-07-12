import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { maintenanceApi, vehicleApi } from "@/lib/api/services";
import { PageHeader } from "@/components/common/states";
import { SERVICE_TYPES, SERVICE_TYPE_LABELS } from "@/lib/constants";
import { ApiRuleError } from "@/lib/api/client";
import { toast } from "sonner";
import type { Maintenance } from "@/types/domain";
import { invalidateMaintenanceDomain } from "@/lib/invalidation";

export const Route = createFileRoute("/_authenticated/maintenance/new")({
  head: () => ({ meta: [{ title: "New maintenance — TransitOps" }] }),
  component: NewMaintenancePage,
});

function NewMaintenancePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const search = Route.useSearch() as Partial<{ vehicleId: string }>;
  const vQ = useQuery({ queryKey: ["vehicles"], queryFn: vehicleApi.list });

  const [v, setV] = useState({
    vehicleId: search.vehicleId ?? "",
    serviceType: "oil_change" as Maintenance["serviceType"],
    description: "",
    priority: "medium" as Maintenance["priority"],
    startDate: new Date().toISOString().slice(0, 10),
    expectedCompletionDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
    cost: 0,
    serviceProvider: "",
    odometerAtService: 0,
    status: "in_progress" as Maintenance["status"],
    notes: "",
  });

  useEffect(() => {
    if (!search.vehicleId || !vQ.data) return;
    const veh = vQ.data.find((x) => x.id === search.vehicleId);
    if (veh) setV((current) => ({ ...current, odometerAtService: veh.odometerKm }));
  }, [search.vehicleId, vQ.data]);

  const mut = useMutation({
    mutationFn: () =>
      maintenanceApi.create({
        ...v,
        startDate: new Date(v.startDate).toISOString(),
        expectedCompletionDate: new Date(v.expectedCompletionDate).toISOString(),
      }),
    onSuccess: (m) => {
      invalidateMaintenanceDomain(qc);
      toast.success(`Maintenance ${m.maintenanceNumber} created — vehicle moved to In Shop.`);
      navigate({ to: "/maintenance/$maintenanceId", params: { maintenanceId: m.id } });
    },
    onError: (e) => toast.error(e instanceof ApiRuleError ? e.message : "Failed to create"),
  });

  const inp = "h-10 w-full rounded-md border bg-background px-3 text-sm";
  return (
    <div className="space-y-6">
      <PageHeader title="New Maintenance Record" />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mut.mutate();
        }}
        className="grid gap-4 rounded-lg border bg-card p-6 md:grid-cols-2"
      >
        <F label="Vehicle" required>
          <select
            required
            value={v.vehicleId}
            onChange={(e) => {
              const veh = vQ.data?.find((x) => x.id === e.target.value);
              setV({ ...v, vehicleId: e.target.value, odometerAtService: veh?.odometerKm ?? 0 });
            }}
            className={inp}
          >
            <option value="">Select vehicle…</option>
            {(vQ.data ?? [])
              .filter((veh) => veh.status !== "retired")
              .map((veh) => (
                <option key={veh.id} value={veh.id} disabled={veh.status === "on_trip"}>
                  {veh.registrationNumber} — {veh.modelName}
                  {veh.status === "on_trip" ? " [on trip]" : ""}
                </option>
              ))}
          </select>
        </F>
        <F label="Service Type">
          <select
            value={v.serviceType}
            onChange={(e) =>
              setV({ ...v, serviceType: e.target.value as Maintenance["serviceType"] })
            }
            className={inp}
          >
            {SERVICE_TYPES.map((t) => (
              <option key={t} value={t}>
                {SERVICE_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </F>
        <F label="Priority">
          <select
            value={v.priority}
            onChange={(e) => setV({ ...v, priority: e.target.value as Maintenance["priority"] })}
            className={inp}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </F>
        <F label="Status">
          <select
            value={v.status}
            onChange={(e) => setV({ ...v, status: e.target.value as Maintenance["status"] })}
            className={inp}
          >
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
          </select>
        </F>
        <F label="Start Date">
          <input
            type="date"
            value={v.startDate}
            onChange={(e) => setV({ ...v, startDate: e.target.value })}
            className={inp}
          />
        </F>
        <F label="Expected Completion">
          <input
            type="date"
            value={v.expectedCompletionDate}
            onChange={(e) => setV({ ...v, expectedCompletionDate: e.target.value })}
            className={inp}
          />
        </F>
        <F label="Estimated Cost">
          <input
            type="number"
            min={0}
            value={v.cost}
            onChange={(e) => setV({ ...v, cost: Number(e.target.value) })}
            className={inp}
          />
        </F>
        <F label="Service Provider">
          <input
            value={v.serviceProvider}
            onChange={(e) => setV({ ...v, serviceProvider: e.target.value })}
            className={inp}
          />
        </F>
        <F label="Odometer at Service">
          <input
            type="number"
            min={0}
            value={v.odometerAtService}
            onChange={(e) => setV({ ...v, odometerAtService: Number(e.target.value) })}
            className={inp}
          />
        </F>
        <F label="Description" full>
          <textarea
            value={v.description}
            onChange={(e) => setV({ ...v, description: e.target.value })}
            rows={2}
            className={inp}
          />
        </F>
        <F label="Notes" full>
          <textarea
            value={v.notes}
            onChange={(e) => setV({ ...v, notes: e.target.value })}
            rows={2}
            className={inp}
          />
        </F>
        <div className="md:col-span-2 flex justify-end border-t pt-4">
          <button
            disabled={mut.isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {mut.isPending ? "Saving…" : "Create record"}
          </button>
        </div>
      </form>
    </div>
  );
}

function F({
  label,
  required,
  full,
  children,
}: {
  label: string;
  required?: boolean;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive">*</span>}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { vehicleApi, driverApi, tripApi, evaluateDispatch } from "@/lib/api/services";
import { PageHeader } from "@/components/common/states";
import { REGIONS } from "@/lib/constants";
import { ApiRuleError } from "@/lib/api/client";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/trips/new")({
  head: () => ({ meta: [{ title: "New trip — TransitOps" }] }),
  component: NewTripPage,
});

function NewTripPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const vQ = useQuery({ queryKey: ["vehicles"], queryFn: vehicleApi.list });
  const dQ = useQuery({ queryKey: ["drivers"], queryFn: driverApi.list });

  const [v, setV] = useState({
    source: "Gandhinagar Depot",
    destination: "Ahmedabad Hub",
    region: "west",
    vehicleId: "",
    driverId: "",
    cargoWeightKg: 450,
    cargoDescription: "",
    plannedDistanceKm: 32,
    plannedDepartureAt: new Date(Date.now() + 3600_000).toISOString().slice(0, 16),
    expectedRevenue: 4500,
    notes: "",
  });

  const issues = useMemo(
    () => evaluateDispatch(v.vehicleId || undefined, v.driverId || undefined, v.cargoWeightKg),
    [v.vehicleId, v.driverId, v.cargoWeightKg],
  );

  const mut = useMutation({
    mutationFn: () =>
      tripApi.create({
        ...v,
        plannedDepartureAt: new Date(v.plannedDepartureAt).toISOString(),
      }),
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: ["trips"] });
      qc.invalidateQueries({ queryKey: ["dashboard-kpis"] });
      toast.success(`Trip ${t.tripNumber} created`);
      navigate({ to: "/trips/$tripId", params: { tripId: t.id } });
    },
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await mut.mutateAsync();
    } catch (e) {
      if (e instanceof ApiRuleError) toast.error(e.message);
    }
  }

  const inp =
    "h-10 w-full rounded-md border bg-background px-3 text-sm focus:border-ring focus:outline-hidden focus:ring-2 focus:ring-ring/30";
  const blockingIssues = v.vehicleId && v.driverId ? issues : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Trip"
        description="Draft a new trip. It won't be dispatched until you review the eligibility checks."
      />
      <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-6 space-y-4 lg:col-span-2">
          <div className="grid gap-4 md:grid-cols-2">
            <F label="Source" required>
              <input
                value={v.source}
                onChange={(e) => setV({ ...v, source: e.target.value })}
                className={inp}
                required
              />
            </F>
            <F label="Destination" required>
              <input
                value={v.destination}
                onChange={(e) => setV({ ...v, destination: e.target.value })}
                className={inp}
                required
              />
            </F>
            <F label="Region">
              <select
                value={v.region}
                onChange={(e) => setV({ ...v, region: e.target.value })}
                className={inp}
              >
                {REGIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </F>
            <F label="Planned Departure" required>
              <input
                type="datetime-local"
                value={v.plannedDepartureAt}
                onChange={(e) => setV({ ...v, plannedDepartureAt: e.target.value })}
                className={inp}
              />
            </F>
            <F label="Vehicle" required>
              <select
                value={v.vehicleId}
                onChange={(e) => setV({ ...v, vehicleId: e.target.value })}
                className={inp}
                required
              >
                <option value="">Select vehicle…</option>
                {(vQ.data ?? []).map((veh) => (
                  <option key={veh.id} value={veh.id} disabled={veh.status !== "available"}>
                    {veh.registrationNumber} — {veh.modelName} ({veh.maxCapacityKg} kg)
                    {veh.status !== "available" ? ` [${veh.status.replace("_", " ")}]` : ""}
                  </option>
                ))}
              </select>
            </F>
            <F label="Driver" required>
              <select
                value={v.driverId}
                onChange={(e) => setV({ ...v, driverId: e.target.value })}
                className={inp}
                required
              >
                <option value="">Select driver…</option>
                {(dQ.data ?? []).map((d) => {
                  const disabled =
                    d.status !== "available" || new Date(d.licenceExpiry) <= new Date();
                  return (
                    <option key={d.id} value={d.id} disabled={disabled}>
                      {d.fullName} — {d.licenceCategory}
                      {disabled
                        ? ` [${d.status === "available" ? "licence expired" : d.status.replace("_", " ")}]`
                        : ""}
                    </option>
                  );
                })}
              </select>
            </F>
            <F label="Cargo Weight (kg)" required>
              <input
                type="number"
                min={1}
                value={v.cargoWeightKg}
                onChange={(e) => setV({ ...v, cargoWeightKg: Number(e.target.value) })}
                className={inp}
              />
            </F>
            <F label="Planned Distance (km)" required>
              <input
                type="number"
                min={1}
                value={v.plannedDistanceKm}
                onChange={(e) => setV({ ...v, plannedDistanceKm: Number(e.target.value) })}
                className={inp}
              />
            </F>
            <F label="Expected Revenue">
              <input
                type="number"
                min={0}
                value={v.expectedRevenue}
                onChange={(e) => setV({ ...v, expectedRevenue: Number(e.target.value) })}
                className={inp}
              />
            </F>
            <F label="Cargo Description" full>
              <input
                value={v.cargoDescription}
                onChange={(e) => setV({ ...v, cargoDescription: e.target.value })}
                className={inp}
              />
            </F>
            <F label="Notes" full>
              <textarea
                value={v.notes}
                onChange={(e) => setV({ ...v, notes: e.target.value })}
                rows={3}
                className={inp}
              />
            </F>
          </div>
        </div>

        <aside className="rounded-lg border bg-card p-4 space-y-3 h-fit">
          <h3 className="text-sm font-semibold">Dispatch Eligibility</h3>
          {!v.vehicleId || !v.driverId ? (
            <p className="text-xs text-muted-foreground">
              Select a vehicle and driver to see eligibility.
            </p>
          ) : blockingIssues.length === 0 ? (
            <div className="flex items-start gap-2 rounded-md border border-status-available-foreground/30 bg-status-available/40 p-2 text-xs text-status-available-foreground">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              <div>All checks passed. Trip can be dispatched.</div>
            </div>
          ) : (
            <ul className="space-y-2">
              {blockingIssues.map((i, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive"
                >
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <div>{i.message}</div>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t pt-3 space-y-2">
            <button
              type="submit"
              disabled={mut.isPending}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {mut.isPending ? "Saving…" : "Save as draft"}
            </button>
            <p className="text-xs text-muted-foreground">
              You can dispatch or cancel this trip from the trip detail page.
            </p>
          </div>
        </aside>
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

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { driverApi, tripApi, vehicleApi } from "@/lib/api/services";
import { PageHeader, ErrorState } from "@/components/common/states";
import { REGIONS } from "@/lib/constants";
import { ApiRuleError } from "@/lib/api/client";
import { toast } from "sonner";
import { invalidateTripDomain } from "@/lib/invalidation";
import { queryKeys } from "@/lib/query-keys";

export const Route = createFileRoute("/_authenticated/trips/$tripId/edit")({
  head: () => ({ meta: [{ title: "Edit trip - TransitOps" }] }),
  component: EditTripPage,
});

function EditTripPage() {
  const { tripId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const tripQ = useQuery({ queryKey: queryKeys.trip(tripId), queryFn: () => tripApi.get(tripId) });
  const vehiclesQ = useQuery({
    queryKey: queryKeys.eligibleVehicles,
    queryFn: vehicleApi.dispatchEligible,
  });
  const driversQ = useQuery({
    queryKey: queryKeys.eligibleDrivers,
    queryFn: driverApi.dispatchEligible,
  });
  const [form, setForm] = useState({
    source: "",
    destination: "",
    region: "west",
    vehicleId: "",
    driverId: "",
    cargoWeightKg: 0,
    cargoDescription: "",
    plannedDistanceKm: 0,
    plannedDepartureAt: "",
    expectedRevenue: 0,
    notes: "",
  });

  useEffect(() => {
    const trip = tripQ.data;
    if (!trip) return;
    setForm({
      source: trip.source,
      destination: trip.destination,
      region: trip.region,
      vehicleId: trip.vehicleId,
      driverId: trip.driverId,
      cargoWeightKg: trip.cargoWeightKg,
      cargoDescription: trip.cargoDescription ?? "",
      plannedDistanceKm: trip.plannedDistanceKm,
      plannedDepartureAt: trip.plannedDepartureAt.slice(0, 16),
      expectedRevenue: trip.expectedRevenue,
      notes: trip.notes ?? "",
    });
  }, [tripQ.data]);

  const mut = useMutation({
    mutationFn: () =>
      tripApi.update(tripId, {
        ...form,
        plannedDepartureAt: new Date(form.plannedDepartureAt).toISOString(),
      }),
    onSuccess: () => {
      invalidateTripDomain(qc);
      qc.invalidateQueries({ queryKey: queryKeys.trip(tripId) });
      toast.success("Trip updated");
      navigate({ to: "/trips/$tripId", params: { tripId } });
    },
    onError: (e) => toast.error(e instanceof ApiRuleError ? e.message : "Failed to update trip"),
  });

  if (tripQ.isLoading) return <div className="text-sm text-muted-foreground">Loading...</div>;
  if (tripQ.error || !tripQ.data) return <ErrorState onRetry={() => tripQ.refetch()} />;
  if (tripQ.data.status !== "draft") {
    return (
      <ErrorState title="Trip cannot be edited" description="Only draft trips can be edited." />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Edit Trip" description={tripQ.data.tripNumber} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mut.mutate();
        }}
        className="grid gap-6 lg:grid-cols-3"
      >
        <div className="rounded-lg border bg-card p-6 space-y-4 lg:col-span-2">
          <div className="grid gap-4 md:grid-cols-2">
            <F label="Source">
              <input
                required
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                className={inp}
              />
            </F>
            <F label="Destination">
              <input
                required
                value={form.destination}
                onChange={(e) => setForm({ ...form, destination: e.target.value })}
                className={inp}
              />
            </F>
            <F label="Region">
              <select
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                className={inp}
              >
                {REGIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </F>
            <F label="Planned departure">
              <input
                type="datetime-local"
                required
                value={form.plannedDepartureAt}
                onChange={(e) => setForm({ ...form, plannedDepartureAt: e.target.value })}
                className={inp}
              />
            </F>
            <F label="Vehicle">
              <select
                value={form.vehicleId}
                onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
                className={inp}
                required
              >
                <option value="">Select vehicle</option>
                {tripQ.data && !vehiclesQ.data?.some((v) => v.id === tripQ.data.vehicleId) && (
                  <option value={tripQ.data.vehicleId}>Current vehicle</option>
                )}
                {vehiclesQ.data?.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registrationNumber}
                  </option>
                ))}
              </select>
            </F>
            <F label="Driver">
              <select
                value={form.driverId}
                onChange={(e) => setForm({ ...form, driverId: e.target.value })}
                className={inp}
                required
              >
                <option value="">Select driver</option>
                {tripQ.data && !driversQ.data?.some((d) => d.id === tripQ.data.driverId) && (
                  <option value={tripQ.data.driverId}>Current driver</option>
                )}
                {driversQ.data?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fullName}
                  </option>
                ))}
              </select>
            </F>
            <F label="Cargo weight (kg)">
              <input
                type="number"
                min={1}
                value={form.cargoWeightKg}
                onChange={(e) => setForm({ ...form, cargoWeightKg: Number(e.target.value) })}
                className={inp}
              />
            </F>
            <F label="Planned distance (km)">
              <input
                type="number"
                min={1}
                value={form.plannedDistanceKm}
                onChange={(e) => setForm({ ...form, plannedDistanceKm: Number(e.target.value) })}
                className={inp}
              />
            </F>
            <F label="Expected revenue">
              <input
                type="number"
                min={0}
                value={form.expectedRevenue}
                onChange={(e) => setForm({ ...form, expectedRevenue: Number(e.target.value) })}
                className={inp}
              />
            </F>
            <F label="Cargo description">
              <input
                value={form.cargoDescription}
                onChange={(e) => setForm({ ...form, cargoDescription: e.target.value })}
                className={inp}
              />
            </F>
          </div>
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
            onClick={() => navigate({ to: "/trips/$tripId", params: { tripId } })}
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

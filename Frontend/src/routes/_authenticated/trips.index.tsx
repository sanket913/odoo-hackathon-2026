import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tripApi, vehicleApi, driverApi } from "@/lib/api/services";
import { PageHeader } from "@/components/common/states";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { TripStatusBadge } from "@/components/common/status-badges";
import { formatDateTime, formatNumber } from "@/lib/utils/format";
import type { Trip } from "@/types/domain";
import { useAuth } from "@/lib/auth/auth-context";
import { invalidateTripDomain } from "@/lib/invalidation";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/trips/")({
  head: () => ({ meta: [{ title: "Trips — TransitOps" }] }),
  component: TripsPage,
});

function TripsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = user?.role === "admin";
  const tQ = useQuery({ queryKey: ["trips"], queryFn: tripApi.list });
  const vQ = useQuery({ queryKey: ["vehicles"], queryFn: vehicleApi.list });
  const dQ = useQuery({ queryKey: ["drivers"], queryFn: driverApi.list });
  const deleteMut = useMutation({
    mutationFn: tripApi.remove,
    onSuccess: () => {
      invalidateTripDomain(qc);
      toast.success("Trip updated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to delete trip"),
  });

  const cols: DataTableColumn<Trip>[] = [
    {
      key: "id",
      header: "Trip",
      render: (t) => (
        <Link
          to="/trips/$tripId"
          params={{ tripId: t.id }}
          className="font-medium text-brand hover:underline"
        >
          {t.tripNumber}
        </Link>
      ),
    },
    {
      key: "route",
      header: "Route",
      render: (t) => (
        <div>
          <div>
            {t.source} → {t.destination}
          </div>
          <div className="text-xs text-muted-foreground">{t.region}</div>
        </div>
      ),
    },
    {
      key: "veh",
      header: "Vehicle",
      render: (t) => vQ.data?.find((v) => v.id === t.vehicleId)?.registrationNumber ?? "—",
    },
    {
      key: "drv",
      header: "Driver",
      render: (t) => dQ.data?.find((d) => d.id === t.driverId)?.fullName ?? "—",
    },
    {
      key: "cargo",
      header: "Cargo",
      className: "tabular",
      render: (t) => `${formatNumber(t.cargoWeightKg)} kg`,
    },
    {
      key: "dist",
      header: "Distance",
      className: "tabular",
      render: (t) => `${formatNumber(t.plannedDistanceKm)} km`,
    },
    {
      key: "when",
      header: "Departure",
      render: (t) => <span className="text-xs">{formatDateTime(t.plannedDepartureAt)}</span>,
    },
    { key: "status", header: "Status", render: (t) => <TripStatusBadge status={t.status} /> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (t) => (
        <div className="flex justify-end gap-2">
          <Link
            to="/trips/$tripId"
            params={{ tripId: t.id }}
            className="text-xs text-brand hover:underline"
          >
            View
          </Link>
          {t.status === "draft" && (
            <Link
              to="/trips/$tripId/edit"
              params={{ tripId: t.id }}
              className="text-xs text-brand hover:underline"
            >
              Edit
            </Link>
          )}
          {isAdmin && t.status !== "completed" && (
            <button
              type="button"
              onClick={() => {
                const action = t.status === "dispatched" ? "cancel" : "delete";
                if (confirm(`${action === "cancel" ? "Cancel" : "Delete"} ${t.tripNumber}?`))
                  deleteMut.mutate(t.id);
              }}
              disabled={deleteMut.isPending}
              className="text-xs text-destructive hover:underline disabled:opacity-50"
            >
              Delete
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trips"
        description="Dispatch, track and complete trips."
        actions={
          <Link
            to="/trips/new"
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
          >
            New trip
          </Link>
        }
      />
      <DataTable
        data={tQ.data}
        columns={cols}
        rowKey={(t) => t.id}
        loading={tQ.isLoading}
        error={tQ.error}
        onRetry={() => tQ.refetch()}
        searchable
        searchPlaceholder="Search trip, source or destination"
        searchAccessor={(t) => `${t.tripNumber} ${t.source} ${t.destination}`}
      />
    </div>
  );
}

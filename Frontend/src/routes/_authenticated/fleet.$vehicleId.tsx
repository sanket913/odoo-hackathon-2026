import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { vehicleApi, tripApi, maintenanceApi, fuelApi, expenseApi } from "@/lib/api/services";
import { PageHeader, ErrorState } from "@/components/common/states";
import {
  VehicleStatusBadge,
  TripStatusBadge,
  MaintenanceStatusBadge,
} from "@/components/common/status-badges";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils/format";
import { VEHICLE_TYPE_LABELS, SERVICE_TYPE_LABELS, EXPENSE_CATEGORY_LABELS } from "@/lib/constants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { invalidateVehicleDomain } from "@/lib/invalidation";
import { useAuth } from "@/lib/auth/auth-context";

export const Route = createFileRoute("/_authenticated/fleet/$vehicleId")({
  head: () => ({ meta: [{ title: "Vehicle — TransitOps" }] }),
  component: VehicleDetailPage,
});

function VehicleDetailPage() {
  const { vehicleId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const vQ = useQuery({
    queryKey: ["vehicle", vehicleId],
    queryFn: () => vehicleApi.get(vehicleId),
  });
  const tripsQ = useQuery({ queryKey: ["trips"], queryFn: tripApi.list });
  const maintQ = useQuery({ queryKey: ["maintenance"], queryFn: maintenanceApi.list });
  const fuelQ = useQuery({ queryKey: ["fuel"], queryFn: fuelApi.list });
  const expQ = useQuery({ queryKey: ["expenses"], queryFn: expenseApi.list });

  const retireMut = useMutation({
    mutationFn: () => vehicleApi.retire(vehicleId),
    onSuccess: () => {
      invalidateVehicleDomain(qc);
      qc.invalidateQueries({ queryKey: ["vehicle", vehicleId] });
      toast.success("Vehicle retired");
    },
  });

  if (vQ.isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (vQ.error || !vQ.data)
    return (
      <ErrorState
        description={(vQ.error as Error)?.message ?? "Not found"}
        onRetry={() => vQ.refetch()}
      />
    );
  const v = vQ.data;

  const vTrips = (tripsQ.data ?? []).filter((t) => t.vehicleId === v.id);
  const vMaint = (maintQ.data ?? []).filter((m) => m.vehicleId === v.id);
  const vFuel = (fuelQ.data ?? []).filter((f) => f.vehicleId === v.id);
  const vExp = (expQ.data ?? []).filter((e) => e.vehicleId === v.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {v.registrationNumber} <VehicleStatusBadge status={v.status} />
          </span>
        }
        description={`${v.modelName} · ${VEHICLE_TYPE_LABELS[v.type]} · ${v.region}`}
        actions={
          <div className="flex gap-2">
            <Link
              to="/fleet/$vehicleId/edit"
              params={{ vehicleId: v.id }}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
            >
              Edit
            </Link>
            {isAdmin && v.status !== "retired" && (
              <button
                onClick={() => {
                  if (confirm("Retire this vehicle? It will be excluded from all dispatch."))
                    retireMut.mutate();
                }}
                className="rounded-md border border-destructive/40 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10"
              >
                Retire vehicle
              </button>
            )}
            <button
              onClick={() => navigate({ to: "/fleet" })}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
            >
              Back
            </button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Info label="Capacity" value={`${formatNumber(v.maxCapacityKg)} kg`} />
        <Info label="Odometer" value={`${formatNumber(v.odometerKm)} km`} />
        <Info label="Acquisition cost" value={formatCurrency(v.acquisitionCost)} />
        <Info label="Last service" value={formatDate(v.lastServiceDate)} />
      </div>

      <Tabs defaultValue="trips">
        <TabsList>
          <TabsTrigger value="trips">Trips ({vTrips.length})</TabsTrigger>
          <TabsTrigger value="maint">Maintenance ({vMaint.length})</TabsTrigger>
          <TabsTrigger value="fuel">Fuel ({vFuel.length})</TabsTrigger>
          <TabsTrigger value="expense">Expenses ({vExp.length})</TabsTrigger>
          <TabsTrigger value="docs">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="trips" className="mt-4">
          <div className="rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-3 py-2">Trip</th>
                  <th className="px-3 py-2">Route</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Departure</th>
                </tr>
              </thead>
              <tbody>
                {vTrips.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-sm text-muted-foreground">
                      No trips.
                    </td>
                  </tr>
                )}
                {vTrips.map((t) => (
                  <tr key={t.id} className="border-t">
                    <td className="px-3 py-2">
                      <Link
                        to="/trips/$tripId"
                        params={{ tripId: t.id }}
                        className="text-brand hover:underline"
                      >
                        {t.tripNumber}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {t.source} → {t.destination}
                    </td>
                    <td className="px-3 py-2">
                      <TripStatusBadge status={t.status} />
                    </td>
                    <td className="px-3 py-2 text-xs">{formatDate(t.plannedDepartureAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="maint" className="mt-4">
          <div className="rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-3 py-2">Record</th>
                  <th className="px-3 py-2">Service</th>
                  <th className="px-3 py-2">Cost</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {vMaint.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-sm text-muted-foreground">
                      No maintenance records.
                    </td>
                  </tr>
                )}
                {vMaint.map((m) => (
                  <tr key={m.id} className="border-t">
                    <td className="px-3 py-2">{m.maintenanceNumber}</td>
                    <td className="px-3 py-2">{SERVICE_TYPE_LABELS[m.serviceType]}</td>
                    <td className="px-3 py-2 tabular">{formatCurrency(m.finalCost ?? m.cost)}</td>
                    <td className="px-3 py-2">
                      <MaintenanceStatusBadge status={m.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="fuel" className="mt-4">
          <div className="rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Litres</th>
                  <th className="px-3 py-2">Cost</th>
                  <th className="px-3 py-2">Odometer</th>
                </tr>
              </thead>
              <tbody>
                {vFuel.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-sm text-muted-foreground">
                      No fuel logs.
                    </td>
                  </tr>
                )}
                {vFuel.map((f) => (
                  <tr key={f.id} className="border-t">
                    <td className="px-3 py-2 text-xs">{formatDate(f.date)}</td>
                    <td className="px-3 py-2 tabular">{f.litres} L</td>
                    <td className="px-3 py-2 tabular">{formatCurrency(f.totalCost)}</td>
                    <td className="px-3 py-2 tabular">{formatNumber(f.odometerKm)} km</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="expense" className="mt-4">
          <div className="rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {vExp.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-sm text-muted-foreground">
                      No expenses.
                    </td>
                  </tr>
                )}
                {vExp.map((e) => (
                  <tr key={e.id} className="border-t">
                    <td className="px-3 py-2">{e.expenseNumber}</td>
                    <td className="px-3 py-2">{EXPENSE_CATEGORY_LABELS[e.category]}</td>
                    <td className="px-3 py-2">{e.description}</td>
                    <td className="px-3 py-2 tabular">{formatCurrency(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="docs" className="mt-4">
          <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
            <p className="mb-2 font-medium text-foreground">Documents</p>
            <p>
              Upload registration certificate, insurance, pollution certificate, fitness
              certificate, permits and other documents. File uploads will be handled by the backend
              via multipart requests.
            </p>
            <p className="mt-2 text-xs">No documents uploaded yet.</p>
          </div>
        </TabsContent>
      </Tabs>
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

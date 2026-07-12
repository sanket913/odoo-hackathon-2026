import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi, tripApi, vehicleApi, driverApi } from "@/lib/api/services";
import { KpiCard } from "@/components/common/kpi-card";
import { PageHeader, EmptyState } from "@/components/common/states";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import {
  TripStatusBadge,
  VehicleStatusBadge,
  LicenceBadge,
} from "@/components/common/status-badges";
import { formatDateTime, formatDate, daysUntil, pct } from "@/lib/utils/format";
import { Truck, CheckCircle2, Wrench, Radio, Clock, Users, Gauge, RefreshCw } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import type { Trip, Driver } from "@/types/domain";
import { LICENCE_WARN_DAYS } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — TransitOps" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const liveQuery = { refetchInterval: 30_000, refetchOnWindowFocus: true };
  const kpisQ = useQuery({
    queryKey: ["dashboard-kpis"],
    queryFn: dashboardApi.kpis,
    ...liveQuery,
  });
  const tripsQ = useQuery({ queryKey: ["trips"], queryFn: tripApi.list, ...liveQuery });
  const vehiclesQ = useQuery({ queryKey: ["vehicles"], queryFn: vehicleApi.list, ...liveQuery });
  const driversQ = useQuery({ queryKey: ["drivers"], queryFn: driverApi.list, ...liveQuery });

  const kpis = kpisQ.data;
  const recentTrips = (tripsQ.data ?? []).slice(0, 6);
  const vehicles = vehiclesQ.data ?? [];
  const drivers = driversQ.data ?? [];

  const statusData = ["available", "on_trip", "in_shop", "retired"].map((s) => ({
    name: s.replace("_", " "),
    value: vehicles.filter((v) => v.status === s).length,
  }));
  const COLORS = ["#16a34a", "#2563eb", "#d97706", "#dc2626"];

  const licenceAlerts = drivers
    .map((d) => ({ d, days: daysUntil(d.licenceExpiry) }))
    .filter((x) => x.days != null && x.days <= LICENCE_WARN_DAYS)
    .sort((a, b) => (a.days ?? 0) - (b.days ?? 0));

  function refresh() {
    kpisQ.refetch();
    tripsQ.refetch();
    vehiclesQ.refetch();
    driversQ.refetch();
  }

  const tripColumns: DataTableColumn<Trip>[] = [
    {
      key: "id",
      header: "Trip",
      render: (t) => <span className="font-medium">{t.tripNumber}</span>,
    },
    {
      key: "vehicle",
      header: "Vehicle",
      render: (t) => vehicles.find((v) => v.id === t.vehicleId)?.registrationNumber ?? "—",
    },
    {
      key: "driver",
      header: "Driver",
      render: (t) => drivers.find((d) => d.id === t.driverId)?.fullName ?? "—",
    },
    {
      key: "route",
      header: "Route",
      render: (t) => (
        <span className="text-muted-foreground">
          {t.source} → {t.destination}
        </span>
      ),
    },
    { key: "status", header: "Status", render: (t) => <TripStatusBadge status={t.status} /> },
    {
      key: "when",
      header: "Planned",
      render: (t) => (
        <span className="tabular text-xs">{formatDateTime(t.plannedDepartureAt)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operations Dashboard"
        description={`Last refreshed ${formatDateTime(new Date())}`}
        actions={
          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            <RefreshCw className="size-4" /> Refresh
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7">
        <KpiCard
          label="Active Vehicles"
          value={kpis?.activeVehicles ?? "—"}
          icon={<Truck className="size-4" />}
          tone="primary"
          loading={kpisQ.isLoading}
        />
        <KpiCard
          label="Available"
          value={kpis?.availableVehicles ?? "—"}
          icon={<CheckCircle2 className="size-4" />}
          tone="success"
          loading={kpisQ.isLoading}
        />
        <KpiCard
          label="In Maintenance"
          value={kpis?.vehiclesInMaintenance ?? "—"}
          icon={<Wrench className="size-4" />}
          tone="warning"
          loading={kpisQ.isLoading}
        />
        <KpiCard
          label="Active Trips"
          value={kpis?.activeTrips ?? "—"}
          icon={<Radio className="size-4" />}
          tone="primary"
          loading={kpisQ.isLoading}
        />
        <KpiCard
          label="Pending Trips"
          value={kpis?.pendingTrips ?? "—"}
          icon={<Clock className="size-4" />}
          loading={kpisQ.isLoading}
        />
        <KpiCard
          label="Drivers On Duty"
          value={kpis?.driversOnDuty ?? "—"}
          icon={<Users className="size-4" />}
          loading={kpisQ.isLoading}
        />
        <KpiCard
          label="Fleet Utilization"
          value={pct(kpis?.fleetUtilization ?? null)}
          icon={<Gauge className="size-4" />}
          tone="primary"
          loading={kpisQ.isLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-lg border bg-card p-4 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold">Recent Trips</h2>
          <DataTable
            data={recentTrips}
            columns={tripColumns}
            rowKey={(t) => t.id}
            loading={tripsQ.isLoading}
            error={tripsQ.error}
            onRetry={() => tripsQ.refetch()}
            pageSize={6}
          />
        </section>
        <section className="rounded-lg border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">Vehicle Status Distribution</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">Licence Expiry Alerts</h2>
          {licenceAlerts.length === 0 ? (
            <EmptyState
              title="All licences valid"
              description="No drivers have licences expiring in the next 30 days."
            />
          ) : (
            <ul className="divide-y">
              {licenceAlerts.map(({ d, days }: { d: Driver; days: number | null }) => (
                <li key={d.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <div className="font-medium">{d.fullName}</div>
                    <div className="text-xs text-muted-foreground">
                      Expires {formatDate(d.licenceExpiry)}
                    </div>
                  </div>
                  <LicenceBadge daysLeft={days} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">Vehicles Requiring Attention</h2>
          <ul className="divide-y">
            {vehicles
              .filter((v) => v.status === "in_shop" || v.status === "retired")
              .map((v) => (
                <li key={v.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <div className="font-medium">{v.registrationNumber}</div>
                    <div className="text-xs text-muted-foreground">{v.modelName}</div>
                  </div>
                  <VehicleStatusBadge status={v.status} />
                </li>
              ))}
            {vehicles.every((v) => v.status !== "in_shop" && v.status !== "retired") && (
              <EmptyState title="Fleet is fully operational" />
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}

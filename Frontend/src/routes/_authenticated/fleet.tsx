import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { vehicleApi } from "@/lib/api/services";
import { PageHeader } from "@/components/common/states";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { VehicleStatusBadge } from "@/components/common/status-badges";
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils/format";
import { VEHICLE_TYPE_LABELS } from "@/lib/constants";
import { Plus } from "lucide-react";
import type { Vehicle } from "@/types/domain";

export const Route = createFileRoute("/_authenticated/fleet")({
  head: () => ({ meta: [{ title: "Fleet — TransitOps" }] }),
  component: FleetPage,
});

function FleetPage() {
  const q = useQuery({ queryKey: ["vehicles"], queryFn: vehicleApi.list });

  const columns: DataTableColumn<Vehicle>[] = [
    {
      key: "reg",
      header: "Registration",
      accessor: (v) => v.registrationNumber,
      sortable: true,
      render: (v) => (
        <Link
          to="/fleet/$vehicleId"
          params={{ vehicleId: v.id }}
          className="font-medium text-brand hover:underline"
        >
          {v.registrationNumber}
        </Link>
      ),
    },
    {
      key: "model",
      header: "Model / Type",
      render: (v) => (
        <div className="min-w-0">
          <div className="truncate">{v.modelName}</div>
          <div className="text-xs text-muted-foreground">
            {VEHICLE_TYPE_LABELS[v.type]} · {v.region}
          </div>
        </div>
      ),
    },
    {
      key: "cap",
      header: "Capacity",
      accessor: (v) => v.maxCapacityKg,
      sortable: true,
      className: "text-right tabular",
      render: (v) => `${formatNumber(v.maxCapacityKg)} kg`,
    },
    {
      key: "odo",
      header: "Odometer",
      accessor: (v) => v.odometerKm,
      sortable: true,
      className: "text-right tabular",
      render: (v) => `${formatNumber(v.odometerKm)} km`,
    },
    {
      key: "cost",
      header: "Acquisition",
      accessor: (v) => v.acquisitionCost,
      sortable: true,
      className: "text-right tabular",
      render: (v) => formatCurrency(v.acquisitionCost),
    },
    { key: "status", header: "Status", render: (v) => <VehicleStatusBadge status={v.status} /> },
    {
      key: "svc",
      header: "Last Service",
      render: (v) => (
        <span className="text-xs text-muted-foreground">{formatDate(v.lastServiceDate)}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-28 text-right",
      render: (v) => (
        <Link
          to="/fleet/$vehicleId/edit"
          params={{ vehicleId: v.id }}
          className="text-xs text-brand hover:underline"
        >
          Edit
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicle Registry"
        description="Manage the fleet of vehicles available for dispatch and maintenance."
        actions={
          <Link
            to="/fleet/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
          >
            <Plus className="size-4" /> Add vehicle
          </Link>
        }
      />
      <DataTable
        data={q.data}
        columns={columns}
        rowKey={(v) => v.id}
        loading={q.isLoading}
        error={q.error}
        onRetry={() => q.refetch()}
        searchable
        searchPlaceholder="Search registration or model"
        searchAccessor={(v) => `${v.registrationNumber} ${v.modelName} ${v.type} ${v.region}`}
      />
    </div>
  );
}

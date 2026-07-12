import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { maintenanceApi, vehicleApi } from "@/lib/api/services";
import { PageHeader } from "@/components/common/states";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { MaintenanceStatusBadge } from "@/components/common/status-badges";
import { SERVICE_TYPE_LABELS } from "@/lib/constants";
import { formatDate, formatCurrency } from "@/lib/utils/format";
import type { Maintenance } from "@/types/domain";

export const Route = createFileRoute("/_authenticated/maintenance")({
  head: () => ({ meta: [{ title: "Maintenance — TransitOps" }] }),
  component: MaintenancePage,
});

function MaintenancePage() {
  const mQ = useQuery({ queryKey: ["maintenance"], queryFn: maintenanceApi.list });
  const vQ = useQuery({ queryKey: ["vehicles"], queryFn: vehicleApi.list });

  const cols: DataTableColumn<Maintenance>[] = [
    {
      key: "id",
      header: "Record",
      render: (m) => (
        <Link
          to="/maintenance/$maintenanceId"
          params={{ maintenanceId: m.id }}
          className="font-medium text-brand hover:underline"
        >
          {m.maintenanceNumber}
        </Link>
      ),
    },
    {
      key: "veh",
      header: "Vehicle",
      render: (m) => vQ.data?.find((v) => v.id === m.vehicleId)?.registrationNumber ?? "—",
    },
    { key: "svc", header: "Service Type", render: (m) => SERVICE_TYPE_LABELS[m.serviceType] },
    { key: "start", header: "Start", render: (m) => formatDate(m.startDate) },
    { key: "eta", header: "Expected", render: (m) => formatDate(m.expectedCompletionDate) },
    {
      key: "cost",
      header: "Cost",
      className: "tabular",
      render: (m) => formatCurrency(m.finalCost ?? m.cost),
    },
    {
      key: "prov",
      header: "Provider",
      render: (m) => <span className="text-xs text-muted-foreground">{m.serviceProvider}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (m) => <MaintenanceStatusBadge status={m.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance"
        description="Schedule, track and close vehicle service records."
        actions={
          <Link
            to="/maintenance/new"
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
          >
            New maintenance
          </Link>
        }
      />
      <DataTable
        data={mQ.data}
        columns={cols}
        rowKey={(m) => m.id}
        loading={mQ.isLoading}
        error={mQ.error}
        onRetry={() => mQ.refetch()}
        searchable
        searchAccessor={(m) => `${m.maintenanceNumber} ${m.serviceProvider} ${m.description}`}
      />
    </div>
  );
}

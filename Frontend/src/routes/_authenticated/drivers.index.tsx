import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { driverApi } from "@/lib/api/services";
import { PageHeader } from "@/components/common/states";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { DriverStatusBadge, LicenceBadge } from "@/components/common/status-badges";
import { formatDate, daysUntil, pct } from "@/lib/utils/format";
import type { Driver } from "@/types/domain";
import { useAuth } from "@/lib/auth/auth-context";
import { invalidateDriverDomain } from "@/lib/invalidation";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/drivers/")({
  head: () => ({ meta: [{ title: "Drivers — TransitOps" }] }),
  component: DriversPage,
});

function DriversPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = user?.role === "admin";
  const q = useQuery({ queryKey: ["drivers"], queryFn: driverApi.list });
  const deleteMut = useMutation({
    mutationFn: driverApi.remove,
    onSuccess: () => {
      invalidateDriverDomain(qc);
      toast.success("Driver suspended");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to suspend driver"),
  });

  const columns: DataTableColumn<Driver>[] = [
    {
      key: "name",
      header: "Driver",
      accessor: (d) => d.fullName,
      sortable: true,
      render: (d) => (
        <div>
          <div className="font-medium">{d.fullName}</div>
          <div className="text-xs text-muted-foreground">{d.contactNumber}</div>
        </div>
      ),
    },
    {
      key: "lic",
      header: "Licence",
      render: (d) => (
        <div>
          <div className="font-mono text-xs">{d.licenceNumber}</div>
          <div className="text-xs text-muted-foreground">
            {d.licenceCategory} · exp {formatDate(d.licenceExpiry)}
          </div>
        </div>
      ),
    },
    {
      key: "licstatus",
      header: "Compliance",
      render: (d) => <LicenceBadge daysLeft={daysUntil(d.licenceExpiry)} />,
    },
    {
      key: "safety",
      header: "Safety",
      accessor: (d) => d.safetyScore,
      sortable: true,
      className: "tabular",
      render: (d) => `${d.safetyScore}/100`,
    },
    {
      key: "comp",
      header: "Trip Completion",
      className: "tabular",
      render: (d) => pct(d.tripCompletionRate),
    },
    { key: "status", header: "Status", render: (d) => <DriverStatusBadge status={d.status} /> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (d) => (
        <div className="flex justify-end gap-2">
          <Link
            to="/drivers/$driverId"
            params={{ driverId: d.id }}
            className="text-xs text-brand hover:underline"
          >
            View
          </Link>
          <Link
            to="/drivers/$driverId/edit"
            params={{ driverId: d.id }}
            className="text-xs text-brand hover:underline"
          >
            Edit
          </Link>
          {isAdmin && d.status !== "suspended" && (
            <button
              type="button"
              onClick={() => {
                if (confirm(`Suspend ${d.fullName}?`)) deleteMut.mutate(d.id);
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
        title="Drivers & Safety Profiles"
        description="Manage driver records, licences and compliance."
        actions={
          <Link
            to="/drivers/new"
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
          >
            Add driver
          </Link>
        }
      />
      <DataTable
        data={q.data}
        columns={columns}
        rowKey={(d) => d.id}
        loading={q.isLoading}
        error={q.error}
        onRetry={() => q.refetch()}
        searchable
        searchPlaceholder="Search name or licence"
        searchAccessor={(d) => `${d.fullName} ${d.licenceNumber} ${d.contactNumber}`}
      />
    </div>
  );
}

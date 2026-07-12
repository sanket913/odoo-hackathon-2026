import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationApi } from "@/lib/api/services";
import { PageHeader, EmptyState } from "@/components/common/states";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { formatDateTime } from "@/lib/utils/format";
import { Bell, CheckCheck } from "lucide-react";
import type { AppNotification } from "@/types/domain";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — TransitOps" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const q = useQuery({
    queryKey: ["notifications"],
    queryFn: notificationApi.list,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const qc = useQueryClient();
  const markAll = useMutation({
    mutationFn: notificationApi.markAllRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const markOne = useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const notifs = q.data ?? [];
  const columns: DataTableColumn<AppNotification>[] = [
    {
      key: "title",
      header: "Notification",
      accessor: (n) => n.title,
      sortable: true,
      render: (n) => (
        <div>
          <div className="flex items-center gap-2">
            {!n.read && <span aria-hidden className="size-2 rounded-full bg-primary" />}
            <span className="text-sm font-medium">{n.title}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      accessor: (n) => (n.read ? "read" : "unread"),
      sortable: true,
      render: (n) => (
        <span className={n.read ? "text-muted-foreground" : "font-medium text-primary"}>
          {n.read ? "Read" : "Unread"}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      accessor: (n) => n.type,
      sortable: true,
      render: (n) => <span className="capitalize">{n.type.replaceAll("_", " ")}</span>,
    },
    {
      key: "created",
      header: "Created",
      accessor: (n) => n.createdAt,
      sortable: true,
      render: (n) => <span className="text-xs">{formatDateTime(n.createdAt)}</span>,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (n) =>
        !n.read ? (
          <button
            type="button"
            onClick={() => markOne.mutate(n.id)}
            className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
          >
            Mark read
          </button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Notifications"
        actions={
          <button
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
            className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-muted"
          >
            <CheckCheck className="size-4" /> Mark all read
          </button>
        }
      />
      {notifs.length === 0 ? (
        <EmptyState icon={<Bell className="size-6" />} title="You're all caught up" />
      ) : (
        <DataTable
          data={notifs}
          columns={columns}
          loading={q.isLoading}
          error={q.error}
          onRetry={() => q.refetch()}
          rowKey={(n) => n.id}
          searchable
          searchPlaceholder="Search notifications..."
          searchAccessor={(n) => `${n.title} ${n.message} ${n.type} ${n.relatedType ?? ""}`}
          pageSize={10}
        />
      )}
    </div>
  );
}

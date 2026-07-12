import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationApi } from "@/lib/api/services";
import { PageHeader, EmptyState } from "@/components/common/states";
import { formatDateTime } from "@/lib/utils/format";
import { Bell, CheckCheck } from "lucide-react";

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
        <ul className="rounded-lg border bg-card divide-y">
          {notifs.map((n) => (
            <li
              key={n.id}
              className={`flex items-start justify-between gap-3 p-4 ${!n.read ? "bg-accent/30" : ""}`}
            >
              <div>
                <div className="flex items-center gap-2">
                  {!n.read && <span aria-hidden className="size-2 rounded-full bg-primary" />}
                  <span className="text-sm font-medium">{n.title}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                <div className="mt-1 text-xs text-muted-foreground">
                  {formatDateTime(n.createdAt)}
                </div>
              </div>
              {!n.read && (
                <button
                  onClick={() => markOne.mutate(n.id)}
                  className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                >
                  Mark read
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

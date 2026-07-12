import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { driverApi, tripApi } from "@/lib/api/services";
import { PageHeader, ErrorState } from "@/components/common/states";
import {
  DriverStatusBadge,
  LicenceBadge,
  TripStatusBadge,
} from "@/components/common/status-badges";
import { formatDate, daysUntil, pct } from "@/lib/utils/format";
import { useAuth } from "@/lib/auth/auth-context";
import { invalidateDriverDomain } from "@/lib/invalidation";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/drivers/$driverId")({
  head: () => ({ meta: [{ title: "Driver — TransitOps" }] }),
  component: DriverDetailPage,
});

function DriverDetailPage() {
  const { driverId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = user?.role === "admin";
  const dQ = useQuery({ queryKey: ["driver", driverId], queryFn: () => driverApi.get(driverId) });
  const tQ = useQuery({ queryKey: ["trips"], queryFn: tripApi.list });
  const deleteMut = useMutation({
    mutationFn: () => driverApi.remove(driverId),
    onSuccess: () => {
      invalidateDriverDomain(qc);
      qc.invalidateQueries({ queryKey: ["driver", driverId] });
      toast.success("Driver suspended");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to suspend driver"),
  });

  if (dQ.isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (dQ.error || !dQ.data) return <ErrorState onRetry={() => dQ.refetch()} />;
  const d = dQ.data;
  const trips = (tQ.data ?? []).filter((t) => t.driverId === d.id);
  const days = daysUntil(d.licenceExpiry);

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {d.fullName} <DriverStatusBadge status={d.status} />
          </span>
        }
        description={`${d.licenceCategory} · ${d.contactNumber}`}
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => navigate({ to: "/drivers/$driverId/edit", params: { driverId } })}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
            >
              Edit
            </button>
            {isAdmin && d.status !== "suspended" && (
              <button
                onClick={() => {
                  if (confirm(`Suspend ${d.fullName}?`)) deleteMut.mutate();
                }}
                disabled={deleteMut.isPending}
                className="rounded-md border border-destructive/40 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-60"
              >
                Delete
              </button>
            )}
            <button
              onClick={() => navigate({ to: "/drivers" })}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
            >
              Back
            </button>
          </div>
        }
      />
      <div className="grid gap-4 md:grid-cols-4">
        <Info
          label="Licence"
          value={
            <div className="flex items-center gap-2">
              {d.licenceNumber} <LicenceBadge daysLeft={days} />
            </div>
          }
        />
        <Info label="Licence expires" value={formatDate(d.licenceExpiry)} />
        <Info label="Safety Score" value={`${d.safetyScore}/100`} />
        <Info label="Trip Completion" value={pct(d.tripCompletionRate)} />
      </div>
      {d.notes && (
        <div className="rounded-md border-l-4 border-l-status-warning-foreground bg-status-warning/30 p-3 text-sm">
          {d.notes}
        </div>
      )}
      <section className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Trip History</h2>
        {trips.length === 0 ? (
          <div className="p-3 text-sm text-muted-foreground">No trips.</div>
        ) : (
          <div className="divide-y">
            {trips.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <div className="font-medium">{t.tripNumber}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.source} → {t.destination}
                  </div>
                </div>
                <TripStatusBadge status={t.status} />
              </div>
            ))}
          </div>
        )}
      </section>
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

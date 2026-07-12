import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { mapApi, tripApi, vehicleApi, driverApi } from "@/lib/api/services";
import { PageHeader } from "@/components/common/states";
import { TripStatusBadge } from "@/components/common/status-badges";
import { formatDateTime } from "@/lib/utils/format";

const FleetMap = lazy(() =>
  import("@/components/maps/fleet-map").then((m) => ({ default: m.FleetMap })),
);

export const Route = createFileRoute("/_authenticated/live-operations")({
  head: () => ({ meta: [{ title: "Live Operations — TransitOps" }] }),
  component: LiveOpsPage,
});

function LiveOpsPage() {
  const lQ = useQuery({
    queryKey: ["locations"],
    queryFn: mapApi.locations,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
  const tQ = useQuery({
    queryKey: ["trips"],
    queryFn: tripApi.list,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
  const vQ = useQuery({
    queryKey: ["vehicles"],
    queryFn: vehicleApi.list,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
  const dQ = useQuery({
    queryKey: ["drivers"],
    queryFn: driverApi.list,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });

  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const activeTrips = (tQ.data ?? []).filter((t) => t.status === "dispatched");
  const selected = activeTrips.find((t) => t.id === selectedTripId) ?? activeTrips[0];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Live Operations"
        description="Real-time fleet positions and active trips."
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="rounded-lg border bg-card p-2">
          <Suspense
            fallback={
              <div className="grid h-[480px] place-items-center text-sm text-muted-foreground">
                Loading map…
              </div>
            }
          >
            <FleetMap
              locations={lQ.data ?? []}
              routeSource={selected?.sourceCoords}
              routeDestination={selected?.destinationCoords}
              height={480}
            />
          </Suspense>
        </div>
        <aside className="rounded-lg border bg-card p-3 space-y-2">
          <h3 className="text-sm font-semibold">Active Trips ({activeTrips.length})</h3>
          {activeTrips.length === 0 && (
            <div className="text-sm text-muted-foreground">No active trips.</div>
          )}
          {activeTrips.map((t) => {
            const veh = vQ.data?.find((v) => v.id === t.vehicleId);
            const drv = dQ.data?.find((d) => d.id === t.driverId);
            const active = selected?.id === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSelectedTripId(t.id)}
                className={`w-full rounded-md border p-3 text-left text-sm transition-colors ${active ? "border-primary bg-accent" : "hover:bg-muted/40"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{t.tripNumber}</span>
                  <TripStatusBadge status={t.status} />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {t.source} → {t.destination}
                </div>
                <div className="mt-1 text-xs">
                  {veh?.registrationNumber} · {drv?.fullName}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Dispatched {formatDateTime(t.dispatchedAt)}
                </div>
              </button>
            );
          })}
        </aside>
      </div>
    </div>
  );
}

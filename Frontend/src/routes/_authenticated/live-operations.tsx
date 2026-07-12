import { createFileRoute, useRouter } from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RefreshCw, Search as SearchIcon, X as XIcon, Play, Pause } from "lucide-react";

import { PageHeader } from "@/components/common/states";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { tripApi, vehicleApi, driverApi } from "@/lib/api/services";
import { exceptionApi, liveOpsApi, opsTimelineApi } from "@/lib/api/services-extended";
import { formatRelativeMinutes } from "@/features/live-operations/utils";
import {
  useEnrichedTrips,
  useLiveOpsSelection,
  useVisibleLocations,
  filterExceptions,
} from "@/features/live-operations/hooks";
import {
  ActiveTripCard,
  ExceptionCard,
  TimelineRow,
  VehicleRow,
} from "@/features/live-operations/panels";
import { TripDetailDrawer } from "@/features/live-operations/trip-drawer";
import { useAuth } from "@/lib/auth/auth-context";
import { can } from "@/lib/permissions";
import { REGIONS, VEHICLE_TYPES, VEHICLE_TYPE_LABELS } from "@/lib/constants";
import { TRIP_STATUS_LABELS } from "@/lib/constants";
import type { LiveOpsFilters } from "@/types/domain-extended";
import type { TripStatus } from "@/types/domain";

const FleetMap = lazy(() =>
  import("@/components/maps/fleet-map").then((m) => ({ default: m.FleetMap })),
);

export const Route = createFileRoute("/_authenticated/live-operations")({
  head: () => ({ meta: [{ title: "Live Operations — TransitOps" }] }),
  component: LiveOpsPage,
});

const DEFAULT_FILTERS: LiveOpsFilters = {
  search: "",
  status: "all",
  region: "all",
  risk: "all",
  vehicleType: "all",
};

function LiveOpsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const canOperate = user ? can(user.role, "live_operations", "operate") : false;

  const [filters, setFilters] = useState<LiveOpsFilters>(DEFAULT_FILTERS);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [tab, setTab] = useState("trips");
  const selection = useLiveOpsSelection();

  const refetchInterval = autoRefresh ? 15_000 : false;
  const locQ = useQuery({
    queryKey: ["ops.locations"],
    queryFn: () => liveOpsApi.filteredLocations({}),
    refetchInterval,
  });
  const tripsQ = useQuery({
    queryKey: ["trips"],
    queryFn: tripApi.list,
    refetchInterval,
  });
  const vehiclesQ = useQuery({ queryKey: ["vehicles"], queryFn: vehicleApi.list });
  const driversQ = useQuery({ queryKey: ["drivers"], queryFn: driverApi.list });
  const excQ = useQuery({
    queryKey: ["ops.exceptions"],
    queryFn: exceptionApi.list,
    refetchInterval,
  });
  const tlQ = useQuery({
    queryKey: ["ops.timeline"],
    queryFn: () => opsTimelineApi.list(30),
    refetchInterval,
  });

  const enrichedTrips = useEnrichedTrips(tripsQ.data, vehiclesQ.data, driversQ.data, {
    ...filters,
    // "Active Trips" tab is dispatched-only by default unless user picked a status filter.
    status: filters.status && filters.status !== "all" ? filters.status : "dispatched",
  });
  const visibleLocations = useVisibleLocations(locQ.data, vehiclesQ.data, filters);
  const visibleExceptions = useMemo(
    () => filterExceptions(excQ.data, filters),
    [excQ.data, filters],
  );

  const selectedEnriched =
    enrichedTrips.find((e) => e.trip.id === selection.selectedTripId) ?? null;

  const delayedIds = useMemo(
    () =>
      enrichedTrips
        .filter((e) => e.progress.riskLevel === "high")
        .map((e) => e.vehicle?.id)
        .filter((id): id is string => !!id),
    [enrichedTrips],
  );

  const openTripForCompletion = (tripId: string) => {
    selection.closeDrawer();
    router.navigate({ to: "/trips/$tripId", params: { tripId } });
  };
  const cancelTrip = useMutation({
    mutationFn: (tripId: string) => tripApi.cancel(tripId, "Cancelled from Live Operations"),
    onSuccess: () => {
      toast.success("Trip cancelled");
      selection.closeDrawer();
      void qc.invalidateQueries({ queryKey: ["trips"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to cancel trip"),
  });
  const resolveExc = useMutation({
    mutationFn: (id: string) => exceptionApi.resolve(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ops.exceptions"] }),
  });
  const dismissExc = useMutation({
    mutationFn: (id: string) => exceptionApi.dismiss(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ops.exceptions"] }),
  });

  const lastUpdated =
    locQ.dataUpdatedAt || tripsQ.dataUpdatedAt
      ? new Date(Math.max(locQ.dataUpdatedAt, tripsQ.dataUpdatedAt))
      : null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Live Operations"
        description="Fleet positions, active trips, exceptions and operational events."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {lastUpdated ? `Updated ${formatRelativeMinutes(lastUpdated.toISOString())}` : "—"}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAutoRefresh((v) => !v)}
              title={autoRefresh ? "Pause auto-refresh" : "Resume auto-refresh"}
            >
              {autoRefresh ? (
                <Pause className="mr-1 size-3.5" />
              ) : (
                <Play className="mr-1 size-3.5" />
              )}
              {autoRefresh ? "Auto" : "Paused"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void qc.invalidateQueries({ queryKey: ["ops.locations"] });
                void qc.invalidateQueries({ queryKey: ["trips"] });
                void qc.invalidateQueries({ queryKey: ["ops.exceptions"] });
                void qc.invalidateQueries({ queryKey: ["ops.timeline"] });
              }}
            >
              <RefreshCw className="mr-1 size-3.5" /> Refresh
            </Button>
          </div>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
        <div className="relative min-w-[220px] flex-1">
          <SearchIcon className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            value={filters.search ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="Search trip #, vehicle, driver, source, destination"
          />
        </div>
        <FilterSelect
          value={filters.status ?? "all"}
          onChange={(v) => setFilters((f) => ({ ...f, status: v as TripStatus | "all" }))}
          placeholder="Status"
          options={[
            { value: "all", label: "All statuses" },
            ...Object.entries(TRIP_STATUS_LABELS).map(([value, label]) => ({ value, label })),
          ]}
        />
        <FilterSelect
          value={filters.region ?? "all"}
          onChange={(v) => setFilters((f) => ({ ...f, region: v }))}
          placeholder="Region"
          options={[
            { value: "all", label: "All regions" },
            ...REGIONS.map((r) => ({ value: r.id, label: r.name })),
          ]}
        />
        <FilterSelect
          value={filters.risk ?? "all"}
          onChange={(v) => setFilters((f) => ({ ...f, risk: v as LiveOpsFilters["risk"] }))}
          placeholder="Risk"
          options={[
            { value: "all", label: "All risk" },
            { value: "low", label: "On track" },
            { value: "medium", label: "At risk" },
            { value: "high", label: "High risk" },
          ]}
        />
        <FilterSelect
          value={filters.vehicleType ?? "all"}
          onChange={(v) => setFilters((f) => ({ ...f, vehicleType: v }))}
          placeholder="Vehicle type"
          options={[
            { value: "all", label: "All types" },
            ...VEHICLE_TYPES.map((t) => ({ value: t, label: VEHICLE_TYPE_LABELS[t] })),
          ]}
        />
        <Button size="sm" variant="ghost" onClick={() => setFilters(DEFAULT_FILTERS)}>
          <XIcon className="mr-1 size-3.5" /> Clear
        </Button>
      </div>

      {/* Map + tabs */}
      <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
        <div className="rounded-lg border bg-card p-2">
          <Suspense
            fallback={
              <div className="grid h-[520px] place-items-center text-sm text-muted-foreground">
                Loading map…
              </div>
            }
          >
            <FleetMap
              locations={visibleLocations}
              routeSource={selectedEnriched?.trip.sourceCoords}
              routeDestination={selectedEnriched?.trip.destinationCoords}
              selectedVehicleId={selection.selectedVehicleId}
              delayedVehicleIds={delayedIds}
              height={520}
              loading={locQ.isLoading}
              error={locQ.error ? "Could not load vehicle locations." : null}
              onRetry={() => locQ.refetch()}
              fitTrigger={selection.fitTrigger}
              onMarkerClick={(loc) => selection.focusVehicle(loc.vehicleId)}
              onOpenVehicle={(id) =>
                router.navigate({ to: "/fleet/$vehicleId", params: { vehicleId: id } })
              }
            />
          </Suspense>
        </div>

        <aside className="rounded-lg border bg-card">
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="trips">Trips ({enrichedTrips.length})</TabsTrigger>
              <TabsTrigger value="exceptions">Exceptions ({visibleExceptions.length})</TabsTrigger>
              <TabsTrigger value="vehicles">Vehicles ({visibleLocations.length})</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="trips" className="space-y-2 p-3 max-h-[560px] overflow-y-auto">
              {tripsQ.isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
              {!tripsQ.isLoading && enrichedTrips.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  No trips match the current filters.
                </div>
              )}
              {enrichedTrips.map((e) => (
                <ActiveTripCard
                  key={e.trip.id}
                  enriched={e}
                  active={selection.selectedTripId === e.trip.id}
                  onSelect={() => selection.selectTrip(e.trip.id, e.vehicle?.id ?? null)}
                  onFocus={() => e.vehicle && selection.focusVehicle(e.vehicle.id)}
                />
              ))}
            </TabsContent>

            <TabsContent value="exceptions" className="space-y-2 p-3 max-h-[560px] overflow-y-auto">
              {excQ.isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
              {!excQ.isLoading && visibleExceptions.length === 0 && (
                <div className="text-sm text-muted-foreground">No open exceptions.</div>
              )}
              {visibleExceptions.map((e) => (
                <ExceptionCard
                  key={e.id}
                  exception={e}
                  onFocusMap={() =>
                    e.focusVehicleId
                      ? selection.focusVehicle(e.focusVehicleId)
                      : e.focusTripId
                        ? selection.selectTrip(e.focusTripId)
                        : undefined
                  }
                  onResolve={() => resolveExc.mutate(e.id)}
                  onDismiss={() => dismissExc.mutate(e.id)}
                  onNavigate={() => {
                    const a = e.correctiveAction;
                    if (!a.route) return;
                    router.navigate({
                      to: a.route,
                      params: a.params ?? {},
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    } as any);
                  }}
                />
              ))}
            </TabsContent>

            <TabsContent value="vehicles" className="space-y-2 p-3 max-h-[560px] overflow-y-auto">
              {visibleLocations.length === 0 && (
                <div className="text-sm text-muted-foreground">No vehicles on the map.</div>
              )}
              {visibleLocations.map((loc) => (
                <VehicleRow
                  key={loc.vehicleId}
                  location={loc}
                  vehicle={vehiclesQ.data?.find((v) => v.id === loc.vehicleId)}
                  driver={driversQ.data?.find((d) =>
                    tripsQ.data?.some((t) => t.id === loc.tripId && t.driverId === d.id),
                  )}
                  onFocus={() => selection.focusVehicle(loc.vehicleId)}
                />
              ))}
            </TabsContent>

            <TabsContent value="timeline" className="space-y-3 p-3 max-h-[560px] overflow-y-auto">
              {tlQ.data?.length === 0 && (
                <div className="text-sm text-muted-foreground">No recent events.</div>
              )}
              {tlQ.data?.map((ev) => (
                <TimelineRow key={ev.id} event={ev} />
              ))}
            </TabsContent>
          </Tabs>
        </aside>
      </div>

      <TripDetailDrawer
        enriched={selection.drawerOpen ? selectedEnriched : null}
        onClose={() => selection.closeDrawer()}
        onFocusMap={(vehicleId) => selection.focusVehicle(vehicleId)}
        onComplete={canOperate ? openTripForCompletion : undefined}
        onCancel={canOperate ? (id) => cancelTrip.mutate(id) : undefined}
        canOperate={canOperate}
      />
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-[150px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

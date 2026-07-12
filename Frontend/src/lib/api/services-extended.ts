import { differenceInDays, differenceInMinutes, parseISO } from "date-fns";
import {
  driverApi,
  mapApi,
  maintenanceApi,
  notificationApi,
  tripApi,
  vehicleApi,
} from "@/lib/api/services";
import type {
  LiveOpsFilters,
  LiveTripProgress,
  OperationalException,
  OpsTimelineEvent,
} from "@/types/domain-extended";
import type { Trip, Vehicle, VehicleLocation } from "@/types/domain";

const exceptionState = new Map<string, "open" | "resolved" | "dismissed">();

function exceptionStatus(id: string) {
  return exceptionState.get(id) ?? "open";
}

export function computeTripProgressFromTrip(
  trip: Trip,
  location?: VehicleLocation,
): LiveTripProgress {
  const now = Date.now();
  const started = trip.dispatchedAt ? new Date(trip.dispatchedAt).getTime() : now;
  const expectedHours = Math.max(1, trip.plannedDistanceKm / 45);
  const expectedEnd = started + expectedHours * 3600_000;
  const progressPercent =
    trip.status === "completed"
      ? 100
      : trip.status !== "dispatched"
        ? 0
        : Math.max(5, Math.min(100, Math.round(((now - started) / (expectedEnd - started)) * 100)));
  return {
    tripId: trip.id,
    progressPercent,
    currentCoords: location
      ? { lat: location.latitude, lng: location.longitude }
      : trip.sourceCoords,
    etaAt: new Date(expectedEnd).toISOString(),
    lastUpdateAt: location?.updatedAt ?? new Date().toISOString(),
    riskLevel:
      progressPercent >= 100 && trip.status === "dispatched"
        ? "high"
        : progressPercent >= 80
          ? "medium"
          : "low",
  };
}

function buildVehicleExceptions(vehicles: Vehicle[]): OperationalException[] {
  return vehicles.flatMap((v) => {
    const out: OperationalException[] = [];
    if (v.status === "in_shop") {
      out.push({
        id: `exc-vehicle-shop-${v.id}`,
        type: "vehicle_in_shop",
        severity: "medium",
        title: "Vehicle in maintenance",
        description: `${v.registrationNumber} is currently in the workshop.`,
        entity: { type: "vehicle", id: v.id, label: v.registrationNumber },
        createdAt: new Date().toISOString(),
        status: exceptionStatus(`exc-vehicle-shop-${v.id}`),
        correctiveAction: {
          code: "open_vehicle",
          label: "Open vehicle",
          route: "/fleet/$vehicleId",
          params: { vehicleId: v.id },
        },
        focusVehicleId: v.id,
      });
    }
    if (v.lastServiceDate) {
      const days = differenceInDays(new Date(), parseISO(v.lastServiceDate));
      if (days > 180 && v.status !== "retired") {
        out.push({
          id: `exc-service-${v.id}`,
          type: "vehicle_service_overdue",
          severity: days > 270 ? "high" : "medium",
          title: "Service overdue",
          description: `${v.registrationNumber} last serviced ${days} day(s) ago.`,
          entity: { type: "vehicle", id: v.id, label: v.registrationNumber },
          createdAt: new Date().toISOString(),
          status: exceptionStatus(`exc-service-${v.id}`),
          correctiveAction: {
            code: "create_maintenance",
            label: "Create maintenance",
            route: "/maintenance/new",
            params: { vehicleId: v.id },
          },
          focusVehicleId: v.id,
        });
      }
    }
    return out;
  });
}

export const exceptionApi = {
  async list(): Promise<OperationalException[]> {
    const [vehicles, drivers, maintenance, locations] = await Promise.all([
      vehicleApi.list(),
      driverApi.list(),
      maintenanceApi.list(),
      mapApi.locations(),
    ]);
    const driverExceptions: OperationalException[] = drivers.flatMap((d) => {
      const days = differenceInDays(parseISO(d.licenceExpiry), new Date());
      if (days > 30 && d.status !== "suspended") return [];
      const expired = days <= 0;
      const id = expired
        ? `exc-lic-exp-${d.id}`
        : d.status === "suspended"
          ? `exc-drv-susp-${d.id}`
          : `exc-lic-soon-${d.id}`;
      return [
        {
          id,
          type: expired
            ? "driver_licence_expired"
            : d.status === "suspended"
              ? "driver_suspended"
              : "driver_licence_expiring",
          severity:
            expired || d.status === "suspended" ? "critical" : days <= 7 ? "high" : "medium",
          title: expired
            ? "Driver licence expired"
            : d.status === "suspended"
              ? "Driver suspended"
              : "Licence expiring soon",
          description: expired
            ? `${d.fullName}'s licence has expired.`
            : d.status === "suspended"
              ? `${d.fullName} is currently suspended.`
              : `${d.fullName}'s licence expires in ${days} day(s).`,
          entity: { type: "driver", id: d.id, label: d.fullName },
          createdAt: d.licenceExpiry,
          status: exceptionStatus(id),
          correctiveAction: {
            code: "open_driver",
            label: "Open driver",
            route: "/drivers/$driverId",
            params: { driverId: d.id },
          },
        } satisfies OperationalException,
      ];
    });
    const maintExceptions: OperationalException[] = maintenance
      .filter(
        (m) =>
          (m.status === "open" || m.status === "in_progress") &&
          new Date(m.expectedCompletionDate) < new Date(),
      )
      .map((m) => ({
        id: `exc-maint-${m.id}`,
        type: "maintenance_overdue",
        severity: "high",
        title: "Maintenance overdue",
        description: `${m.maintenanceNumber} passed its expected completion date.`,
        entity: { type: "maintenance", id: m.id, label: m.maintenanceNumber },
        createdAt: m.expectedCompletionDate,
        status: exceptionStatus(`exc-maint-${m.id}`),
        correctiveAction: {
          code: "open_maintenance",
          label: "Open maintenance",
          route: "/maintenance/$maintenanceId",
          params: { maintenanceId: m.id },
        },
        focusVehicleId: m.vehicleId,
      }));
    const staleLocationExceptions: OperationalException[] = locations
      .filter((l) => differenceInMinutes(new Date(), parseISO(l.updatedAt)) > 60)
      .map((l) => ({
        id: `exc-location-${l.vehicleId}`,
        type: "stale_vehicle_location",
        severity: "low",
        title: "Stale vehicle location",
        description: `${l.registrationNumber} location is older than 60 minutes.`,
        entity: { type: "vehicle", id: l.vehicleId, label: l.registrationNumber },
        createdAt: l.updatedAt,
        status: exceptionStatus(`exc-location-${l.vehicleId}`),
        correctiveAction: {
          code: "open_vehicle",
          label: "Open vehicle",
          route: "/fleet/$vehicleId",
          params: { vehicleId: l.vehicleId },
        },
        focusVehicleId: l.vehicleId,
      }));
    return [
      ...buildVehicleExceptions(vehicles),
      ...driverExceptions,
      ...maintExceptions,
      ...staleLocationExceptions,
    ]
      .filter((e) => e.status !== "dismissed")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
  async resolve(id: string) {
    exceptionState.set(id, "resolved");
    return { ok: true };
  },
  async dismiss(id: string) {
    exceptionState.set(id, "dismissed");
    return { ok: true };
  },
};

export const opsTimelineApi = {
  async list(limit = 30): Promise<OpsTimelineEvent[]> {
    const [trips, notifications] = await Promise.all([tripApi.list(), notificationApi.list()]);
    const tripEvents = trips.slice(0, limit).map(
      (t) =>
        ({
          id: `trip-${t.id}`,
          type:
            t.status === "completed"
              ? "trip_completed"
              : t.status === "cancelled"
                ? "trip_cancelled"
                : t.status === "dispatched"
                  ? "trip_dispatched"
                  : "trip_created",
          title: `${t.tripNumber} ${t.status.replace("_", " ")}`,
          description: `${t.source} to ${t.destination}`,
          actor: "TransitOps",
          at: t.completedAt ?? t.cancelledAt ?? t.dispatchedAt ?? t.createdAt,
          entity: { type: "trip", id: t.id, label: t.tripNumber },
        }) satisfies OpsTimelineEvent,
    );
    const notificationEvents = notifications.slice(0, limit).map(
      (n) =>
        ({
          id: `notification-${n.id}`,
          type: "exception_created",
          title: n.title,
          description: n.message,
          actor: "System",
          at: n.createdAt,
          entity: n.relatedId
            ? { type: (n.relatedType ?? "notification") as never, id: n.relatedId, label: n.title }
            : undefined,
        }) satisfies OpsTimelineEvent,
    );
    return [...tripEvents, ...notificationEvents]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, limit);
  },
};

export const liveOpsApi = {
  filterTrips(trips: Trip[], filters: LiveOpsFilters): Trip[] {
    return trips.filter((t) => {
      if (filters.status && filters.status !== "all" && t.status !== filters.status) return false;
      if (filters.region && filters.region !== "all" && t.region !== filters.region) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        return [t.tripNumber, t.source, t.destination].some((x) => x.toLowerCase().includes(q));
      }
      return true;
    });
  },
  async filteredLocations(_filters: LiveOpsFilters = {}): Promise<VehicleLocation[]> {
    return mapApi.locations();
  },
  async progress(tripId: string): Promise<LiveTripProgress> {
    const [trip, locations] = await Promise.all([tripApi.get(tripId), mapApi.locations()]);
    return computeTripProgressFromTrip(
      trip,
      locations.find((l) => l.vehicleId === trip.vehicleId),
    );
  },
};

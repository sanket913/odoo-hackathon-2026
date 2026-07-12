import { useMemo, useState } from "react";
import type { OperationalException, LiveOpsFilters } from "@/types/domain-extended";
import type { Trip, Vehicle, Driver, VehicleLocation } from "@/types/domain";
import type { EnrichedTrip } from "./utils";
import { computeTripProgressFromTrip, liveOpsApi } from "@/lib/api/services-extended";

export function useLiveOpsSelection() {
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [fitTrigger, setFitTrigger] = useState("0");
  return {
    selectedTripId,
    selectedVehicleId,
    drawerOpen,
    fitTrigger,
    selectTrip(id: string | null, vehicleId?: string | null) {
      setSelectedTripId(id);
      if (vehicleId !== undefined) setSelectedVehicleId(vehicleId);
      setDrawerOpen(!!id);
      setFitTrigger(String(Date.now()));
    },
    focusVehicle(vehicleId: string | null) {
      setSelectedVehicleId(vehicleId);
      setFitTrigger(String(Date.now()));
    },
    closeDrawer() {
      setDrawerOpen(false);
    },
  };
}

export function useEnrichedTrips(
  trips: Trip[] | undefined,
  vehicles: Vehicle[] | undefined,
  drivers: Driver[] | undefined,
  filters: LiveOpsFilters,
): EnrichedTrip[] {
  return useMemo(() => {
    if (!trips) return [];
    const filtered = liveOpsApi.filterTrips(trips, filters);
    return filtered.map((trip) => ({
      trip,
      vehicle: vehicles?.find((v) => v.id === trip.vehicleId),
      driver: drivers?.find((d) => d.id === trip.driverId),
      progress: computeTripProgressFromTrip(trip, undefined),
    }));
  }, [trips, vehicles, drivers, filters]);
}

export function useVisibleLocations(
  locations: VehicleLocation[] | undefined,
  vehicles: Vehicle[] | undefined,
  filters: LiveOpsFilters,
): VehicleLocation[] {
  return useMemo(() => {
    if (!locations) return [];
    return locations.filter((loc) => {
      const v = vehicles?.find((x) => x.id === loc.vehicleId);
      if (filters.region && filters.region !== "all" && v?.region !== filters.region) return false;
      if (filters.vehicleType && filters.vehicleType !== "all" && v?.type !== filters.vehicleType)
        return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (
          !loc.registrationNumber.toLowerCase().includes(q) &&
          !v?.modelName.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [locations, vehicles, filters]);
}

export function filterExceptions(
  exceptions: OperationalException[] | undefined,
  filters: LiveOpsFilters,
): OperationalException[] {
  if (!exceptions) return [];
  return exceptions.filter((e) => {
    if (e.status !== "open") return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const hit =
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.entity.label.toLowerCase().includes(q);
      if (!hit) return false;
    }
    return true;
  });
}

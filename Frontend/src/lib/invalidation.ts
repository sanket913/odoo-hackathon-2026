import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export function invalidateVehicleDomain(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: queryKeys.vehicles });
  qc.invalidateQueries({ queryKey: queryKeys.eligibleVehicles });
  qc.invalidateQueries({ queryKey: queryKeys.dashboard });
  qc.invalidateQueries({ queryKey: queryKeys.locations });
  qc.invalidateQueries({ queryKey: queryKeys.analyticsSummary });
  qc.invalidateQueries({ queryKey: queryKeys.analyticsByVehicle });
}

export function invalidateDriverDomain(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: queryKeys.drivers });
  qc.invalidateQueries({ queryKey: queryKeys.eligibleDrivers });
  qc.invalidateQueries({ queryKey: queryKeys.dashboard });
}

export function invalidateTripDomain(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: queryKeys.trips });
  qc.invalidateQueries({ queryKey: queryKeys.vehicles });
  qc.invalidateQueries({ queryKey: queryKeys.drivers });
  qc.invalidateQueries({ queryKey: queryKeys.eligibleVehicles });
  qc.invalidateQueries({ queryKey: queryKeys.eligibleDrivers });
  qc.invalidateQueries({ queryKey: queryKeys.dashboard });
  qc.invalidateQueries({ queryKey: queryKeys.locations });
  qc.invalidateQueries({ queryKey: queryKeys.analyticsSummary });
  qc.invalidateQueries({ queryKey: queryKeys.analyticsByVehicle });
  qc.invalidateQueries({ queryKey: queryKeys.notifications });
}

export function invalidateMaintenanceDomain(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: queryKeys.maintenance });
  qc.invalidateQueries({ queryKey: queryKeys.vehicles });
  qc.invalidateQueries({ queryKey: queryKeys.eligibleVehicles });
  qc.invalidateQueries({ queryKey: queryKeys.dashboard });
  qc.invalidateQueries({ queryKey: queryKeys.locations });
  qc.invalidateQueries({ queryKey: queryKeys.analyticsSummary });
  qc.invalidateQueries({ queryKey: queryKeys.analyticsByVehicle });
  qc.invalidateQueries({ queryKey: queryKeys.notifications });
}

export function invalidateCostDomain(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: queryKeys.fuel });
  qc.invalidateQueries({ queryKey: queryKeys.expenses });
  qc.invalidateQueries({ queryKey: queryKeys.vehicles });
  qc.invalidateQueries({ queryKey: queryKeys.trips });
  qc.invalidateQueries({ queryKey: queryKeys.analyticsSummary });
  qc.invalidateQueries({ queryKey: queryKeys.analyticsByVehicle });
  qc.invalidateQueries({ queryKey: queryKeys.notifications });
}

export function invalidateAllOperationalData(qc: QueryClient) {
  invalidateVehicleDomain(qc);
  invalidateDriverDomain(qc);
  invalidateTripDomain(qc);
  invalidateMaintenanceDomain(qc);
  invalidateCostDomain(qc);
}

// In-memory mock store — replaceable by real REST API.
import {
  seedUsers,
  seedVehicles,
  seedDrivers,
  seedTrips,
  seedMaintenance,
  seedFuel,
  seedExpenses,
  seedNotifications,
  seedLocations,
} from "./seed";
import type {
  User,
  Vehicle,
  Driver,
  Trip,
  Maintenance,
  FuelLog,
  Expense,
  AppNotification,
  VehicleLocation,
} from "@/types/domain";

interface Store {
  users: User[];
  vehicles: Vehicle[];
  drivers: Driver[];
  trips: Trip[];
  maintenance: Maintenance[];
  fuel: FuelLog[];
  expenses: Expense[];
  notifications: AppNotification[];
  locations: VehicleLocation[];
}

export const store: Store = {
  users: [...seedUsers],
  vehicles: [...seedVehicles],
  drivers: [...seedDrivers],
  trips: [...seedTrips],
  maintenance: [...seedMaintenance],
  fuel: [...seedFuel],
  expenses: [...seedExpenses],
  notifications: [...seedNotifications],
  locations: [...seedLocations],
};

export function nextId(prefix: string): string {
  return `${prefix}${Math.random().toString(36).slice(2, 9)}`;
}

export function nextNumber(
  prefix: string,
  existing: { [k: string]: string }[],
  field: string,
): string {
  const nums = existing
    .map((r) => r[field])
    .filter(Boolean)
    .map((n) => Number(String(n).replace(/\D/g, "")))
    .filter((n) => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

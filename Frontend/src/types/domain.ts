// TransitOps domain types

export type UserRole =
  "admin" | "fleet_manager" | "dispatcher" | "safety_officer" | "financial_analyst";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "active" | "inactive";
  lastLoginAt?: string;
  avatarUrl?: string;
}

export type VehicleStatus = "available" | "on_trip" | "in_shop" | "retired";
export type VehicleType = "van" | "truck" | "mini_truck" | "trailer" | "pickup";
export type FuelType = "diesel" | "petrol" | "cng" | "electric";

export interface Vehicle {
  id: string;
  registrationNumber: string;
  modelName: string;
  type: VehicleType;
  region: string;
  maxCapacityKg: number;
  odometerKm: number;
  acquisitionCost: number;
  fuelType: FuelType;
  manufacturingYear: number;
  status: VehicleStatus;
  lastServiceDate?: string;
  notes?: string;
  createdAt: string;
}

export type DriverStatus = "available" | "on_trip" | "off_duty" | "suspended";
export type LicenceCategory = "LMV" | "HMV" | "HGV" | "PSV" | "TRANS";

export interface Driver {
  id: string;
  fullName: string;
  licenceNumber: string;
  licenceCategory: LicenceCategory;
  licenceExpiry: string;
  contactNumber: string;
  email?: string;
  safetyScore: number;
  tripCompletionRate: number;
  status: DriverStatus;
  region: string;
  emergencyContact?: string;
  notes?: string;
  createdAt: string;
}

export type TripStatus = "draft" | "dispatched" | "completed" | "cancelled";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Trip {
  id: string;
  tripNumber: string;
  source: string;
  destination: string;
  sourceCoords?: GeoPoint;
  destinationCoords?: GeoPoint;
  region: string;
  vehicleId: string;
  driverId: string;
  cargoWeightKg: number;
  cargoDescription?: string;
  plannedDistanceKm: number;
  actualDistanceKm?: number;
  plannedDepartureAt: string;
  dispatchedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  expectedRevenue: number;
  startingOdometerKm?: number;
  finalOdometerKm?: number;
  fuelConsumedLitres?: number;
  fuelCost?: number;
  additionalExpense?: number;
  notes?: string;
  status: TripStatus;
  createdAt: string;
}

export type MaintenanceStatus = "open" | "in_progress" | "completed" | "cancelled";
export type MaintenancePriority = "low" | "medium" | "high" | "critical";
export type ServiceType =
  | "oil_change"
  | "tyre_replacement"
  | "engine_repair"
  | "brake_service"
  | "battery_replacement"
  | "general_inspection"
  | "other";

export interface Maintenance {
  id: string;
  maintenanceNumber: string;
  vehicleId: string;
  serviceType: ServiceType;
  description: string;
  priority: MaintenancePriority;
  startDate: string;
  expectedCompletionDate: string;
  completionDate?: string;
  cost: number;
  finalCost?: number;
  serviceProvider: string;
  odometerAtService: number;
  workPerformed?: string;
  nextServiceDate?: string;
  nextServiceOdometerKm?: number;
  status: MaintenanceStatus;
  notes?: string;
  createdAt: string;
}

export interface FuelLog {
  id: string;
  vehicleId: string;
  tripId?: string;
  date: string;
  litres: number;
  totalCost: number;
  odometerKm: number;
  fuelStation?: string;
  receiptRef?: string;
  notes?: string;
  createdAt: string;
}

export type ExpenseCategory =
  "toll" | "maintenance" | "parking" | "permit" | "repair" | "fine" | "other";

export interface Expense {
  id: string;
  expenseNumber: string;
  vehicleId: string;
  tripId?: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  expenseDate: string;
  receiptRef?: string;
  notes?: string;
  createdAt: string;
}

export type NotificationType =
  | "licence_expiring"
  | "licence_expired"
  | "maintenance_due"
  | "vehicle_in_shop"
  | "trip_dispatched"
  | "trip_completed"
  | "trip_cancelled"
  | "driver_suspended"
  | "fuel_logged"
  | "high_cost_alert";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  relatedId?: string;
  relatedType?: "vehicle" | "driver" | "trip" | "maintenance";
  createdAt: string;
}

export interface DashboardKpis {
  activeVehicles: number;
  availableVehicles: number;
  vehiclesInMaintenance: number;
  activeTrips: number;
  pendingTrips: number;
  driversOnDuty: number;
  fleetUtilization: number;
}

export interface VehicleLocation {
  vehicleId: string;
  registrationNumber: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speedKph?: number;
  status: VehicleStatus;
  tripId?: string;
  updatedAt: string;
}

export interface Region {
  id: string;
  name: string;
  code: string;
}

export interface DispatchEligibilityIssue {
  code: string;
  message: string;
  field?: string;
}

export interface Paginated<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  fields?: Record<string, string[]>;
}

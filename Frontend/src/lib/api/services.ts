import { store, nextId, nextNumber } from "@/mocks/store";
import {
  delay,
  MOCK_LATENCY_MS,
  ApiRuleError,
  isMockMode,
  http,
  unwrapData,
  unwrapList,
} from "@/lib/api/client";
import type {
  Vehicle,
  Driver,
  Trip,
  Maintenance,
  FuelLog,
  Expense,
  AppNotification,
  User,
  VehicleLocation,
  DashboardKpis,
  DispatchEligibilityIssue,
  Region,
  MasterVehicleType,
  MasterLicenceCategory,
} from "@/types/domain";
import { differenceInDays, parseISO } from "date-fns";

async function getData<T>(promise: Promise<{ data: { success: true; data: T } }>): Promise<T> {
  const res = await promise;
  return unwrapData<T>(res.data);
}

async function getList<T>(promise: Promise<{ data: unknown }>): Promise<T[]> {
  const res = await promise;
  return unwrapList<T>(res.data);
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const authApi = {
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getData(http.post("/auth/login", { email, password }));
    const user = store.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user || password.length < 4) {
      throw new ApiRuleError({
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password.",
      });
    }
    if (user.status !== "active") {
      throw new ApiRuleError({ code: "ACCOUNT_INACTIVE", message: "Account is deactivated." });
    }
    user.lastLoginAt = new Date().toISOString();
    return { token: `mock.${user.id}.${Date.now()}`, user };
  },
  async me(): Promise<User | null> {
    await delay(50, null);
    if (!isMockMode()) return getData(http.get("/auth/me"));
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem("transitops.user");
    return raw ? (JSON.parse(raw) as User) : null;
  },
  async requestReset(email: string): Promise<{ ok: true }> {
    await delay(400, null);
    if (!isMockMode()) return getData(http.post("/auth/forgot-password", { email }));
    void email;
    return { ok: true };
  },
  async resetPassword(_token: string, _password: string): Promise<{ ok: true }> {
    await delay(400, null);
    if (!isMockMode())
      return getData(http.post("/auth/reset-password", { token: _token, password: _password }));
    return { ok: true };
  },
  async refresh(): Promise<{ token: string; user: User }> {
    if (!isMockMode()) return getData(http.post("/auth/refresh"));
    const user = await authApi.me();
    if (!user) throw new ApiRuleError({ code: "UNAUTHORIZED", message: "No active session." });
    return { token: `mock.${user.id}.${Date.now()}`, user };
  },
  async logout(): Promise<{ ok: true }> {
    if (!isMockMode()) return getData(http.post("/auth/logout"));
    return { ok: true };
  },
};

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
export const userApi = {
  async list(): Promise<User[]> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getList(http.get("/users"));
    return [...store.users];
  },
  async create(input: Omit<User, "id" | "lastLoginAt"> & { password?: string }): Promise<User> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getData(http.post("/users", input));
    if (store.users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
      throw new ApiRuleError({
        code: "DUPLICATE_EMAIL",
        message: "A user with this email already exists.",
        fields: { email: ["Email must be unique."] },
      });
    }
    const user: User = {
      id: nextId("u"),
      name: input.name,
      email: input.email.toLowerCase(),
      role: input.role,
      status: input.status,
      avatarUrl: input.avatarUrl,
    };
    store.users.unshift(user);
    return user;
  },
  async update(
    id: string,
    input: Partial<Omit<User, "id" | "lastLoginAt">> & { password?: string },
  ): Promise<User> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getData(http.patch(`/users/${id}`, input));
    const idx = store.users.findIndex((u) => u.id === id);
    if (idx === -1) throw new ApiRuleError({ code: "NOT_FOUND", message: "User not found." });
    if (
      input.email &&
      store.users.some((u) => u.id !== id && u.email.toLowerCase() === input.email!.toLowerCase())
    ) {
      throw new ApiRuleError({
        code: "DUPLICATE_EMAIL",
        message: "A user with this email already exists.",
        fields: { email: ["Email must be unique."] },
      });
    }
    store.users[idx] = {
      ...store.users[idx],
      ...input,
      email: input.email?.toLowerCase() ?? store.users[idx].email,
    };
    return store.users[idx];
  },
  async deactivate(id: string): Promise<User> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getData(http.delete(`/users/${id}`));
    return userApi.update(id, { status: "inactive" });
  },
};

export interface OrganizationSettings {
  id: string;
  organizationName: string;
  currency: string;
  distanceUnit: string;
  weightUnit: string;
  timezone: string;
  dateFormat: string;
  updatedAt?: string;
}

export interface IntegrationSettingsStatus {
  environment: string;
  api: {
    clientUrl: string;
    corsOrigins: string[];
    cookieSecure: boolean;
  };
  ai: {
    provider: string;
    configured: boolean;
    model: string;
    requiredKeys: string[];
  };
  uploads: {
    configured: boolean;
    uploadDir: string;
    maxUploadSizeMb: number;
    requiredKeys: string[];
  };
  email: {
    configured: boolean;
    host: string;
    port: string;
    from: string;
    requiredKeys: string[];
  };
  maps: {
    configured: boolean;
    tileUrl: string;
    attribution: string;
    requiredKeys: string[];
  };
}

const mockSettings: OrganizationSettings = {
  id: "settings",
  organizationName: "TransitOps Demo Co.",
  currency: "INR",
  distanceUnit: "kilometres",
  weightUnit: "kilograms",
  timezone: "Asia/Kolkata",
  dateFormat: "dd MMM yyyy",
};

export const settingsApi = {
  async get(): Promise<OrganizationSettings> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getData(http.get("/settings"));
    return { ...mockSettings };
  },
  async update(input: Partial<OrganizationSettings>): Promise<OrganizationSettings> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getData(http.patch("/settings", input));
    Object.assign(mockSettings, input, { updatedAt: new Date().toISOString() });
    return { ...mockSettings };
  },
  async integrations(): Promise<IntegrationSettingsStatus> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getData(http.get("/settings/integrations"));
    return {
      environment: "mock",
      api: {
        clientUrl: "http://localhost:5173",
        corsOrigins: ["http://localhost:5173"],
        cookieSecure: false,
      },
      ai: {
        provider: "Groq",
        configured: true,
        model: "mock-copilot",
        requiredKeys: ["GROQ_API_KEY", "GROQ_MODEL"],
      },
      uploads: {
        configured: true,
        uploadDir: "uploads",
        maxUploadSizeMb: 5,
        requiredKeys: ["UPLOAD_DIR", "MAX_UPLOAD_SIZE_MB"],
      },
      email: {
        configured: false,
        host: "",
        port: "",
        from: "",
        requiredKeys: ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "EMAIL_FROM"],
      },
      maps: {
        configured: true,
        tileUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution: "OpenStreetMap contributors",
        requiredKeys: ["VITE_MAP_TILE_URL", "VITE_MAP_ATTRIBUTION"],
      },
    };
  },
};

export const regionApi = {
  async list(): Promise<Region[]> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getList(http.get("/regions"));
    return [
      { id: "north", code: "N", name: "North" },
      { id: "south", code: "S", name: "South" },
      { id: "east", code: "E", name: "East" },
      { id: "west", code: "W", name: "West" },
      { id: "central", code: "C", name: "Central" },
    ];
  },
};

export const vehicleTypeApi = {
  async list(): Promise<MasterVehicleType[]> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getList(http.get("/vehicle-types"));
    return [
      { id: "van", code: "van", name: "Van" },
      { id: "truck", code: "truck", name: "Truck" },
      { id: "mini_truck", code: "mini_truck", name: "Mini Truck" },
      { id: "trailer", code: "trailer", name: "Trailer" },
      { id: "pickup", code: "pickup", name: "Pickup" },
    ];
  },
};

export const licenceCategoryApi = {
  async list(): Promise<MasterLicenceCategory[]> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getList(http.get("/licence-categories"));
    return [
      { id: "LMV", code: "LMV", name: "LMV" },
      { id: "HMV", code: "HMV", name: "HMV" },
      { id: "HGV", code: "HGV", name: "HGV" },
      { id: "PSV", code: "PSV", name: "PSV" },
      { id: "TRANS", code: "TRANS", name: "TRANS" },
    ];
  },
};

// ---------------------------------------------------------------------------
// Vehicles
// ---------------------------------------------------------------------------
export const vehicleApi = {
  async list(): Promise<Vehicle[]> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getList(http.get("/vehicles"));
    return [...store.vehicles];
  },
  async get(id: string): Promise<Vehicle> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getData(http.get(`/vehicles/${id}`));
    const v = store.vehicles.find((x) => x.id === id);
    if (!v) throw new ApiRuleError({ code: "NOT_FOUND", message: "Vehicle not found." });
    return v;
  },
  async create(input: Omit<Vehicle, "id" | "createdAt">): Promise<Vehicle> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getData(http.post("/vehicles", input));
    const reg = input.registrationNumber.trim().toUpperCase();
    if (store.vehicles.some((v) => v.registrationNumber === reg)) {
      throw new ApiRuleError({
        code: "DUPLICATE_REGISTRATION",
        message: "A vehicle with this registration number already exists.",
        fields: { registrationNumber: ["Registration number must be unique."] },
      });
    }
    const vehicle: Vehicle = {
      ...input,
      registrationNumber: reg,
      id: nextId("v"),
      createdAt: new Date().toISOString(),
    };
    store.vehicles.push(vehicle);
    return vehicle;
  },
  async update(id: string, patch: Partial<Vehicle>): Promise<Vehicle> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getData(http.patch(`/vehicles/${id}`, patch));
    const idx = store.vehicles.findIndex((v) => v.id === id);
    if (idx === -1) throw new ApiRuleError({ code: "NOT_FOUND", message: "Vehicle not found." });
    if (patch.registrationNumber) {
      const reg = patch.registrationNumber.trim().toUpperCase();
      if (store.vehicles.some((v) => v.id !== id && v.registrationNumber === reg)) {
        throw new ApiRuleError({
          code: "DUPLICATE_REGISTRATION",
          message: "A vehicle with this registration number already exists.",
          fields: { registrationNumber: ["Registration number must be unique."] },
        });
      }
      patch.registrationNumber = reg;
    }
    store.vehicles[idx] = { ...store.vehicles[idx], ...patch };
    return store.vehicles[idx];
  },
  async retire(id: string): Promise<Vehicle> {
    if (!isMockMode()) return getData(http.delete(`/vehicles/${id}`));
    return vehicleApi.update(id, { status: "retired" });
  },
  async dispatchEligible(): Promise<Vehicle[]> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getList(http.get("/vehicles/dispatch-eligible"));
    return store.vehicles.filter((v) => v.status === "available");
  },
};

// ---------------------------------------------------------------------------
// Drivers
// ---------------------------------------------------------------------------
export const driverApi = {
  async list(): Promise<Driver[]> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getList(http.get("/drivers"));
    return [...store.drivers];
  },
  async get(id: string): Promise<Driver> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getData(http.get(`/drivers/${id}`));
    const d = store.drivers.find((x) => x.id === id);
    if (!d) throw new ApiRuleError({ code: "NOT_FOUND", message: "Driver not found." });
    return d;
  },
  async create(
    input: Omit<Driver, "id" | "createdAt" | "tripCompletionRate" | "safetyScore">,
  ): Promise<Driver> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getData(http.post("/drivers", input));
    if (store.drivers.some((d) => d.licenceNumber === input.licenceNumber)) {
      throw new ApiRuleError({
        code: "DUPLICATE_LICENCE",
        message: "A driver with this licence number already exists.",
        fields: { licenceNumber: ["Licence number must be unique."] },
      });
    }
    const driver: Driver = {
      ...input,
      safetyScore: calculateMockDriverSafetyScore(input),
      id: nextId("d"),
      tripCompletionRate: 0,
      createdAt: new Date().toISOString(),
    };
    store.drivers.push(driver);
    return driver;
  },
  async update(id: string, patch: Partial<Omit<Driver, "safetyScore">>): Promise<Driver> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getData(http.patch(`/drivers/${id}`, patch));
    const idx = store.drivers.findIndex((d) => d.id === id);
    if (idx === -1) throw new ApiRuleError({ code: "NOT_FOUND", message: "Driver not found." });
    store.drivers[idx] = { ...store.drivers[idx], ...patch };
    store.drivers[idx].safetyScore = calculateMockDriverSafetyScore(store.drivers[idx]);
    return store.drivers[idx];
  },
  async remove(id: string): Promise<Driver> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getData(http.delete(`/drivers/${id}`));
    return driverApi.update(id, { status: "suspended" });
  },
  async dispatchEligible(): Promise<Driver[]> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getList(http.get("/drivers/dispatch-eligible"));
    return store.drivers.filter(
      (d) =>
        d.status === "available" && differenceInDays(parseISO(d.licenceExpiry), new Date()) > 0,
    );
  },
};

function calculateMockDriverSafetyScore(input: {
  licenceExpiry: string;
  licenceCategory: string;
  contactNumber: string;
  email?: string;
  emergencyContact?: string;
  status?: string;
}) {
  let score = 100;
  const daysUntilExpiry = differenceInDays(parseISO(input.licenceExpiry), new Date());
  if (daysUntilExpiry <= 0) score -= 45;
  else if (daysUntilExpiry <= 30) score -= 30;
  else if (daysUntilExpiry <= 90) score -= 18;
  else if (daysUntilExpiry <= 180) score -= 8;

  if (input.status === "suspended") score -= 35;
  if (input.status === "off_duty") score -= 5;
  if (input.status === "on_trip") score -= 3;

  if (!input.emergencyContact?.trim()) score -= 8;
  if (!input.email?.trim()) score -= 3;
  if (input.contactNumber.replace(/\D/g, "").length < 10) score -= 8;
  if (["HMV", "HGV", "TRANS"].includes(input.licenceCategory)) score += 3;

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ---------------------------------------------------------------------------
// Trips  ---  business rules enforced here mimic the backend
// ---------------------------------------------------------------------------
export const tripApi = {
  async list(): Promise<Trip[]> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getList(http.get("/trips"));
    return [...store.trips].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },
  async get(id: string): Promise<Trip> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getData(http.get(`/trips/${id}`));
    const t = store.trips.find((x) => x.id === id);
    if (!t) throw new ApiRuleError({ code: "NOT_FOUND", message: "Trip not found." });
    return t;
  },
  async update(
    id: string,
    patch: Partial<Omit<Trip, "id" | "tripNumber" | "status" | "createdAt">>,
  ): Promise<Trip> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getData(http.patch(`/trips/${id}`, patch));
    const idx = store.trips.findIndex((t) => t.id === id);
    if (idx === -1) throw new ApiRuleError({ code: "NOT_FOUND", message: "Trip not found." });
    if (store.trips[idx].status !== "draft") {
      throw new ApiRuleError({
        code: "INVALID_TRANSITION",
        message: "Only draft trips may be edited.",
      });
    }
    store.trips[idx] = { ...store.trips[idx], ...patch };
    return store.trips[idx];
  },
  async create(input: Omit<Trip, "id" | "tripNumber" | "status" | "createdAt">): Promise<Trip> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getData(http.post("/trips", input));
    validateTripEligibility(input.vehicleId, input.driverId, input.cargoWeightKg);
    const trip: Trip = {
      ...input,
      id: nextId("t"),
      tripNumber: nextNumber(
        "TR-",
        store.trips as unknown as { [k: string]: string }[],
        "tripNumber",
      ),
      status: "draft",
      createdAt: new Date().toISOString(),
    };
    store.trips.unshift(trip);
    return trip;
  },
  async evaluateDispatch(input: {
    tripId?: string;
    vehicleId?: string;
    driverId?: string;
    cargoWeightKg?: number;
    plannedDistanceKm?: number;
    source?: string;
    destination?: string;
  }): Promise<{ eligible: boolean; issues: DispatchEligibilityIssue[] }> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getData(http.post("/trips/evaluate-dispatch", input));
    const issues = evaluateDispatch(input.vehicleId, input.driverId, input.cargoWeightKg);
    return { eligible: issues.length === 0, issues };
  },
  async dispatch(id: string): Promise<Trip> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getData(http.post(`/trips/${id}/dispatch`));
    const trip = mustGetTrip(id);
    if (trip.status !== "draft") {
      throw new ApiRuleError({
        code: "INVALID_TRANSITION",
        message: "Only draft trips can be dispatched.",
      });
    }
    validateTripEligibility(trip.vehicleId, trip.driverId, trip.cargoWeightKg);
    trip.status = "dispatched";
    trip.dispatchedAt = new Date().toISOString();
    const vehicle = store.vehicles.find((v) => v.id === trip.vehicleId);
    if (vehicle) {
      vehicle.status = "on_trip";
      trip.startingOdometerKm = vehicle.odometerKm;
    }
    const driver = store.drivers.find((d) => d.id === trip.driverId);
    if (driver) driver.status = "on_trip";
    pushNotification(
      "trip_dispatched",
      "Trip dispatched",
      `${trip.tripNumber} dispatched to ${trip.destination}.`,
      trip.id,
      "trip",
    );
    return trip;
  },
  async complete(
    id: string,
    input: {
      finalOdometerKm: number;
      fuelConsumedLitres: number;
      fuelCost: number;
      additionalExpense?: number;
      notes?: string;
    },
  ): Promise<Trip> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getData(http.post(`/trips/${id}/complete`, input));
    const trip = mustGetTrip(id);
    if (trip.status !== "dispatched") {
      throw new ApiRuleError({
        code: "INVALID_TRANSITION",
        message: "Only dispatched trips can be completed.",
      });
    }
    if (trip.startingOdometerKm != null && input.finalOdometerKm < trip.startingOdometerKm) {
      throw new ApiRuleError({
        code: "INVALID_ODOMETER",
        message: "Final odometer cannot be lower than starting odometer.",
        fields: {
          finalOdometerKm: ["Final odometer must be greater than or equal to starting odometer."],
        },
      });
    }
    if (input.fuelConsumedLitres < 0 || input.fuelCost < 0) {
      throw new ApiRuleError({
        code: "INVALID_INPUT",
        message: "Fuel values must be non-negative.",
      });
    }
    trip.status = "completed";
    trip.completedAt = new Date().toISOString();
    trip.finalOdometerKm = input.finalOdometerKm;
    trip.actualDistanceKm =
      trip.startingOdometerKm != null
        ? input.finalOdometerKm - trip.startingOdometerKm
        : trip.plannedDistanceKm;
    trip.fuelConsumedLitres = input.fuelConsumedLitres;
    trip.fuelCost = input.fuelCost;
    trip.additionalExpense = input.additionalExpense;
    trip.notes = input.notes ?? trip.notes;

    const vehicle = store.vehicles.find((v) => v.id === trip.vehicleId);
    if (vehicle) {
      vehicle.status = "available";
      vehicle.odometerKm = input.finalOdometerKm;
    }
    const driver = store.drivers.find((d) => d.id === trip.driverId);
    if (driver) driver.status = "available";

    if (input.fuelConsumedLitres > 0) {
      store.fuel.unshift({
        id: nextId("f"),
        vehicleId: trip.vehicleId,
        tripId: trip.id,
        date: new Date().toISOString(),
        litres: input.fuelConsumedLitres,
        totalCost: input.fuelCost,
        odometerKm: input.finalOdometerKm,
        createdAt: new Date().toISOString(),
      });
    }
    if (input.additionalExpense && input.additionalExpense > 0) {
      store.expenses.unshift({
        id: nextId("e"),
        expenseNumber: nextNumber(
          "EX-",
          store.expenses as unknown as { [k: string]: string }[],
          "expenseNumber",
        ),
        vehicleId: trip.vehicleId,
        tripId: trip.id,
        category: "other",
        description: `Trip ${trip.tripNumber} additional expense`,
        amount: input.additionalExpense,
        expenseDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    }
    pushNotification(
      "trip_completed",
      "Trip completed",
      `${trip.tripNumber} completed successfully.`,
      trip.id,
      "trip",
    );
    return trip;
  },
  async cancel(id: string, reason: string): Promise<Trip> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getData(http.post(`/trips/${id}/cancel`, { reason }));
    const trip = mustGetTrip(id);
    if (trip.status === "completed" || trip.status === "cancelled") {
      throw new ApiRuleError({
        code: "INVALID_TRANSITION",
        message: `Cannot cancel a ${trip.status} trip.`,
      });
    }
    if (!reason.trim()) {
      throw new ApiRuleError({
        code: "REASON_REQUIRED",
        message: "Cancellation reason is required.",
        fields: { cancellationReason: ["Reason is required."] },
      });
    }
    const wasDispatched = trip.status === "dispatched";
    trip.status = "cancelled";
    trip.cancelledAt = new Date().toISOString();
    trip.cancellationReason = reason;
    if (wasDispatched) {
      const vehicle = store.vehicles.find((v) => v.id === trip.vehicleId);
      if (vehicle && vehicle.status === "on_trip") vehicle.status = "available";
      const driver = store.drivers.find((d) => d.id === trip.driverId);
      if (driver && driver.status === "on_trip") driver.status = "available";
    }
    pushNotification(
      "trip_cancelled",
      "Trip cancelled",
      `${trip.tripNumber} was cancelled.`,
      trip.id,
      "trip",
    );
    return trip;
  },
  async remove(id: string): Promise<Trip | { ok: true }> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getData(http.delete(`/trips/${id}`));
    const trip = mustGetTrip(id);
    if (trip.status === "completed") {
      throw new ApiRuleError({
        code: "INVALID_TRANSITION",
        message: "Completed trips are retained for audit history.",
      });
    }
    if (trip.status === "dispatched") {
      return tripApi.cancel(id, "Deleted by admin");
    }
    const idx = store.trips.findIndex((t) => t.id === id);
    if (idx >= 0) store.trips.splice(idx, 1);
    return { ok: true };
  },
};

function mustGetTrip(id: string): Trip {
  const trip = store.trips.find((t) => t.id === id);
  if (!trip) throw new ApiRuleError({ code: "NOT_FOUND", message: "Trip not found." });
  return trip;
}

export function evaluateDispatch(
  vehicleId: string | undefined,
  driverId: string | undefined,
  cargoWeightKg: number | undefined,
): DispatchEligibilityIssue[] {
  // Synchronous by design for existing form previews. Real dispatch is rechecked by the backend.
  const issues: DispatchEligibilityIssue[] = [];
  const vehicle = store.vehicles.find((v) => v.id === vehicleId);
  const driver = store.drivers.find((d) => d.id === driverId);

  if (!vehicle) {
    issues.push({ code: "NO_VEHICLE", message: "Select a vehicle.", field: "vehicleId" });
  } else {
    if (vehicle.status === "retired")
      issues.push({
        code: "VEHICLE_RETIRED",
        message: `${vehicle.registrationNumber} is retired and cannot be dispatched.`,
        field: "vehicleId",
      });
    if (vehicle.status === "in_shop")
      issues.push({
        code: "VEHICLE_IN_SHOP",
        message: `${vehicle.registrationNumber} is under active maintenance.`,
        field: "vehicleId",
      });
    if (vehicle.status === "on_trip") {
      const t = store.trips.find((tr) => tr.vehicleId === vehicle.id && tr.status === "dispatched");
      issues.push({
        code: "VEHICLE_ON_TRIP",
        message: `${vehicle.registrationNumber} is currently assigned to ${t?.tripNumber ?? "another trip"}.`,
        field: "vehicleId",
      });
    }
    if (cargoWeightKg != null && cargoWeightKg > vehicle.maxCapacityKg) {
      const over = cargoWeightKg - vehicle.maxCapacityKg;
      issues.push({
        code: "CAPACITY_EXCEEDED",
        message: `${vehicle.registrationNumber} supports ${vehicle.maxCapacityKg} kg; reduce cargo by ${over} kg or select another vehicle.`,
        field: "cargoWeightKg",
      });
    }
  }

  if (!driver) {
    issues.push({ code: "NO_DRIVER", message: "Select a driver.", field: "driverId" });
  } else {
    if (driver.status === "suspended")
      issues.push({
        code: "DRIVER_SUSPENDED",
        message: `${driver.fullName} is suspended and cannot be assigned.`,
        field: "driverId",
      });
    if (driver.status === "off_duty")
      issues.push({
        code: "DRIVER_OFF_DUTY",
        message: `${driver.fullName} is off duty.`,
        field: "driverId",
      });
    if (driver.status === "on_trip") {
      const t = store.trips.find((tr) => tr.driverId === driver.id && tr.status === "dispatched");
      issues.push({
        code: "DRIVER_ON_TRIP",
        message: `${driver.fullName} is currently assigned to ${t?.tripNumber ?? "another trip"}.`,
        field: "driverId",
      });
    }
    const daysLeft = differenceInDays(parseISO(driver.licenceExpiry), new Date());
    if (daysLeft <= 0) {
      const dateStr = new Date(driver.licenceExpiry).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      issues.push({
        code: "LICENCE_EXPIRED",
        message: `${driver.fullName} cannot be assigned because the licence expired on ${dateStr}.`,
        field: "driverId",
      });
    }
  }
  return issues;
}

function validateTripEligibility(vehicleId: string, driverId: string, cargoWeightKg: number): void {
  const issues = evaluateDispatch(vehicleId, driverId, cargoWeightKg);
  if (issues.length) {
    const fields: Record<string, string[]> = {};
    issues.forEach((i) => {
      if (i.field) (fields[i.field] ??= []).push(i.message);
    });
    throw new ApiRuleError({
      code: "DISPATCH_BLOCKED",
      message: issues.map((i) => i.message).join(" "),
      fields,
    });
  }
}

// ---------------------------------------------------------------------------
// Maintenance
// ---------------------------------------------------------------------------
export const maintenanceApi = {
  async list(): Promise<Maintenance[]> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getList(http.get("/maintenance"));
    return [...store.maintenance].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },
  async get(id: string): Promise<Maintenance> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getData(http.get(`/maintenance/${id}`));
    const m = store.maintenance.find((x) => x.id === id);
    if (!m) throw new ApiRuleError({ code: "NOT_FOUND", message: "Maintenance record not found." });
    return m;
  },
  async create(
    input: Omit<Maintenance, "id" | "maintenanceNumber" | "createdAt">,
  ): Promise<Maintenance> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getData(http.post("/maintenance", input));
    const vehicle = store.vehicles.find((v) => v.id === input.vehicleId);
    if (!vehicle) throw new ApiRuleError({ code: "NOT_FOUND", message: "Vehicle not found." });
    if (vehicle.status === "on_trip") {
      throw new ApiRuleError({
        code: "VEHICLE_ON_TRIP",
        message: `${vehicle.registrationNumber} is currently on an active trip and cannot enter maintenance.`,
      });
    }
    const isActive = input.status === "open" || input.status === "in_progress";
    if (
      isActive &&
      store.maintenance.some(
        (m) => m.vehicleId === vehicle.id && (m.status === "open" || m.status === "in_progress"),
      )
    ) {
      throw new ApiRuleError({
        code: "DUPLICATE_ACTIVE_MAINTENANCE",
        message: `${vehicle.registrationNumber} already has an active maintenance record.`,
      });
    }
    const record: Maintenance = {
      ...input,
      id: nextId("m"),
      maintenanceNumber: nextNumber(
        "MT-",
        store.maintenance as unknown as { [k: string]: string }[],
        "maintenanceNumber",
      ),
      createdAt: new Date().toISOString(),
    };
    store.maintenance.push(record);
    if (isActive && vehicle.status !== "retired") {
      vehicle.status = "in_shop";
      pushNotification(
        "vehicle_in_shop",
        "Vehicle moved to In Shop",
        `${vehicle.registrationNumber} has been moved to In Shop and removed from dispatch availability.`,
        vehicle.id,
        "vehicle",
      );
    }
    return record;
  },
  async update(id: string, patch: Partial<Maintenance>): Promise<Maintenance> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getData(http.patch(`/maintenance/${id}`, patch));
    const idx = store.maintenance.findIndex((m) => m.id === id);
    if (idx === -1)
      throw new ApiRuleError({ code: "NOT_FOUND", message: "Maintenance record not found." });
    store.maintenance[idx] = { ...store.maintenance[idx], ...patch };
    return store.maintenance[idx];
  },
  async close(
    id: string,
    input: {
      finalCost: number;
      workPerformed: string;
      completionDate: string;
      nextServiceDate?: string;
      nextServiceOdometerKm?: number;
      returnToAvailable: boolean;
    },
  ): Promise<Maintenance> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getData(http.post(`/maintenance/${id}/close`, input));
    const rec = store.maintenance.find((m) => m.id === id);
    if (!rec)
      throw new ApiRuleError({ code: "NOT_FOUND", message: "Maintenance record not found." });
    if (rec.status === "completed" || rec.status === "cancelled") {
      throw new ApiRuleError({
        code: "INVALID_TRANSITION",
        message: `Cannot close a ${rec.status} maintenance record.`,
      });
    }
    rec.status = "completed";
    rec.completionDate = input.completionDate;
    rec.finalCost = input.finalCost;
    rec.workPerformed = input.workPerformed;
    rec.nextServiceDate = input.nextServiceDate;
    rec.nextServiceOdometerKm = input.nextServiceOdometerKm;

    const vehicle = store.vehicles.find((v) => v.id === rec.vehicleId);
    if (vehicle && vehicle.status !== "retired" && input.returnToAvailable) {
      vehicle.status = "available";
      vehicle.lastServiceDate = input.completionDate;
    }
    return rec;
  },
  async remove(id: string): Promise<{ ok: true }> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getData(http.delete(`/maintenance/${id}`));
    const idx = store.maintenance.findIndex((m) => m.id === id);
    if (idx === -1)
      throw new ApiRuleError({ code: "NOT_FOUND", message: "Maintenance record not found." });
    const rec = store.maintenance[idx];
    if (rec.status === "completed") {
      throw new ApiRuleError({
        code: "INVALID_TRANSITION",
        message: "Completed maintenance records are retained for audit history.",
      });
    }
    store.maintenance.splice(idx, 1);
    const vehicle = store.vehicles.find((v) => v.id === rec.vehicleId);
    const stillActive = store.maintenance.some(
      (m) => m.vehicleId === rec.vehicleId && (m.status === "open" || m.status === "in_progress"),
    );
    if (!stillActive && vehicle && vehicle.status === "in_shop") vehicle.status = "available";
    return { ok: true };
  },
};

// ---------------------------------------------------------------------------
// Fuel & Expense
// ---------------------------------------------------------------------------
export const fuelApi = {
  async list(): Promise<FuelLog[]> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getList(http.get("/fuel-logs"));
    return [...store.fuel].sort((a, b) => (a.date < b.date ? 1 : -1));
  },
  async create(input: Omit<FuelLog, "id" | "createdAt">): Promise<FuelLog> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getData(http.post("/fuel-logs", input));
    if (input.litres <= 0)
      throw new ApiRuleError({
        code: "INVALID_INPUT",
        message: "Litres must be greater than zero.",
      });
    if (input.totalCost < 0)
      throw new ApiRuleError({ code: "INVALID_INPUT", message: "Cost cannot be negative." });
    if (input.tripId) {
      const trip = store.trips.find((t) => t.id === input.tripId);
      if (trip && trip.vehicleId !== input.vehicleId) {
        throw new ApiRuleError({
          code: "TRIP_MISMATCH",
          message: "Selected trip does not belong to this vehicle.",
        });
      }
    }
    const rec: FuelLog = { ...input, id: nextId("f"), createdAt: new Date().toISOString() };
    store.fuel.unshift(rec);
    pushNotification(
      "fuel_logged",
      "Fuel logged",
      `${input.litres} L logged for vehicle.`,
      rec.vehicleId,
      "vehicle",
    );
    return rec;
  },
  async update(id: string, input: Partial<Omit<FuelLog, "id" | "createdAt">>): Promise<FuelLog> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getData(http.patch(`/fuel-logs/${id}`, input));
    const idx = store.fuel.findIndex((f) => f.id === id);
    if (idx === -1) throw new ApiRuleError({ code: "NOT_FOUND", message: "Fuel log not found." });
    store.fuel[idx] = { ...store.fuel[idx], ...input };
    return store.fuel[idx];
  },
  async remove(id: string): Promise<{ ok: true }> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getData(http.delete(`/fuel-logs/${id}`));
    const idx = store.fuel.findIndex((f) => f.id === id);
    if (idx >= 0) store.fuel.splice(idx, 1);
    return { ok: true };
  },
};

export const expenseApi = {
  async list(): Promise<Expense[]> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getList(http.get("/expenses"));
    return [...store.expenses].sort((a, b) => (a.expenseDate < b.expenseDate ? 1 : -1));
  },
  async create(input: Omit<Expense, "id" | "expenseNumber" | "createdAt">): Promise<Expense> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getData(http.post("/expenses", input));
    if (input.amount < 0)
      throw new ApiRuleError({ code: "INVALID_INPUT", message: "Amount must be non-negative." });
    const rec: Expense = {
      ...input,
      id: nextId("e"),
      expenseNumber: nextNumber(
        "EX-",
        store.expenses as unknown as { [k: string]: string }[],
        "expenseNumber",
      ),
      createdAt: new Date().toISOString(),
    };
    store.expenses.unshift(rec);
    return rec;
  },
  async update(
    id: string,
    input: Partial<Omit<Expense, "id" | "expenseNumber" | "createdAt">>,
  ): Promise<Expense> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getData(http.patch(`/expenses/${id}`, input));
    const idx = store.expenses.findIndex((e) => e.id === id);
    if (idx === -1) throw new ApiRuleError({ code: "NOT_FOUND", message: "Expense not found." });
    store.expenses[idx] = { ...store.expenses[idx], ...input };
    return store.expenses[idx];
  },
  async remove(id: string): Promise<{ ok: true }> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getData(http.delete(`/expenses/${id}`));
    const idx = store.expenses.findIndex((e) => e.id === id);
    if (idx >= 0) store.expenses.splice(idx, 1);
    return { ok: true };
  },
};

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
export const notificationApi = {
  async list(): Promise<AppNotification[]> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getList(http.get("/notifications"));
    return [...store.notifications].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },
  async markRead(id: string): Promise<void> {
    await delay(80, null);
    if (!isMockMode()) {
      await http.patch(`/notifications/${id}/read`);
      return;
    }
    const n = store.notifications.find((x) => x.id === id);
    if (n) n.read = true;
  },
  async markAllRead(): Promise<void> {
    await delay(150, null);
    if (!isMockMode()) {
      await http.patch("/notifications/read-all");
      return;
    }
    store.notifications.forEach((n) => (n.read = true));
  },
};

function pushNotification(
  type: AppNotification["type"],
  title: string,
  message: string,
  relatedId?: string,
  relatedType?: AppNotification["relatedType"],
) {
  store.notifications.unshift({
    id: nextId("n"),
    type,
    title,
    message,
    read: false,
    relatedId,
    relatedType,
    createdAt: new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// Live Ops
// ---------------------------------------------------------------------------
export const mapApi = {
  async locations(): Promise<VehicleLocation[]> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getList(http.get("/vehicle-locations"));
    return store.locations.map((loc) => {
      const v = store.vehicles.find((x) => x.id === loc.vehicleId);
      return v ? { ...loc, status: v.status } : loc;
    });
  },
};

// ---------------------------------------------------------------------------
// Dashboard & Analytics
// ---------------------------------------------------------------------------
export const dashboardApi = {
  async kpis(): Promise<DashboardKpis> {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getData(http.get("/dashboard/kpis"));
    const activeVehicles = store.vehicles.filter((v) => v.status !== "retired").length;
    const availableVehicles = store.vehicles.filter((v) => v.status === "available").length;
    const vehiclesInMaintenance = store.vehicles.filter((v) => v.status === "in_shop").length;
    const activeTrips = store.trips.filter((t) => t.status === "dispatched").length;
    const pendingTrips = store.trips.filter((t) => t.status === "draft").length;
    const driversOnDuty = store.drivers.filter(
      (d) => d.status === "available" || d.status === "on_trip",
    ).length;
    const nonRetired = activeVehicles;
    const onTrip = store.vehicles.filter((v) => v.status === "on_trip").length;
    const fleetUtilization = nonRetired > 0 ? (onTrip / nonRetired) * 100 : 0;
    return {
      activeVehicles,
      availableVehicles,
      vehiclesInMaintenance,
      activeTrips,
      pendingTrips,
      driversOnDuty,
      fleetUtilization,
    };
  },
};

export const analyticsApi = {
  async summary() {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getData(http.get("/analytics/summary"));
    const completedTrips = store.trips.filter((t) => t.status === "completed");
    const totalRevenue = completedTrips.reduce((s, t) => s + t.expectedRevenue, 0);
    const totalFuelCost = store.fuel.reduce((s, f) => s + f.totalCost, 0);
    const totalMaintenanceCost = store.maintenance.reduce((s, m) => s + (m.finalCost ?? m.cost), 0);
    const totalOtherExpenses = store.expenses.reduce((s, e) => s + e.amount, 0);
    const totalDistance = completedTrips.reduce((s, t) => s + (t.actualDistanceKm ?? 0), 0);
    const totalLitres = store.fuel.reduce((s, f) => s + f.litres, 0);
    const officialOperationalCost = totalFuelCost + totalMaintenanceCost;
    const extendedOperationalCost = officialOperationalCost + totalOtherExpenses;
    const fuelEfficiency = totalLitres > 0 ? totalDistance / totalLitres : null;
    const nonRetired = store.vehicles.filter((v) => v.status !== "retired").length;
    const onTrip = store.vehicles.filter((v) => v.status === "on_trip").length;
    const fleetUtilization = nonRetired > 0 ? (onTrip / nonRetired) * 100 : null;
    return {
      totalRevenue,
      totalFuelCost,
      totalMaintenanceCost,
      totalOtherExpenses,
      officialOperationalCost,
      extendedOperationalCost,
      fuelEfficiency,
      fleetUtilization,
    };
  },
  async byVehicle() {
    await delay(MOCK_LATENCY_MS, null);
    if (!isMockMode()) return getData(http.get("/analytics/vehicles"));
    return store.vehicles.map((v) => {
      const trips = store.trips.filter((t) => t.vehicleId === v.id && t.status === "completed");
      const revenue = trips.reduce((s, t) => s + t.expectedRevenue, 0);
      const fuelCost = store.fuel
        .filter((f) => f.vehicleId === v.id)
        .reduce((s, f) => s + f.totalCost, 0);
      const maintCost = store.maintenance
        .filter((m) => m.vehicleId === v.id)
        .reduce((s, m) => s + (m.finalCost ?? m.cost), 0);
      const distance = trips.reduce((s, t) => s + (t.actualDistanceKm ?? 0), 0);
      const litres = store.fuel
        .filter((f) => f.vehicleId === v.id)
        .reduce((s, f) => s + f.litres, 0);
      const roi =
        v.acquisitionCost > 0 ? ((revenue - maintCost - fuelCost) / v.acquisitionCost) * 100 : null;
      const efficiency = litres > 0 ? distance / litres : null;
      const opCost = fuelCost + maintCost;
      return { vehicle: v, revenue, fuelCost, maintCost, distance, roi, efficiency, opCost };
    });
  },
};

// ---------------------------------------------------------------------------
// AI Copilot (frontend UI only — real completion happens on the backend)
// ---------------------------------------------------------------------------
export const aiApi = {
  async ask(
    prompt: string,
    history: { role: "user" | "assistant"; content: string }[] = [],
  ): Promise<{ answer: string; sources: string[] }> {
    await delay(600, null);
    if (!isMockMode()) return getData(http.post("/ai/operations-summary", { prompt, history }));
    const availableCount = store.vehicles.filter((v) => v.status === "available").length;
    const onTrip = store.vehicles.filter((v) => v.status === "on_trip").length;
    const inShop = store.vehicles.filter((v) => v.status === "in_shop").length;
    const expiredDrivers = store.drivers.filter(
      (d) => differenceInDays(parseISO(d.licenceExpiry), new Date()) <= 0,
    ).length;
    const answer = `Fleet snapshot: ${availableCount} available, ${onTrip} on trip, ${inShop} in shop.
${expiredDrivers} driver(s) have expired licences — assignment is blocked until renewal.
Suggested action: prioritise MINI-03 return-to-service and schedule tyre inspection on TRUCK-11.

You asked: "${prompt}"`;
    return { answer, sources: ["fleet-status", "driver-compliance", "maintenance-queue"] };
  },
};

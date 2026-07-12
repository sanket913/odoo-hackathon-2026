import type { Driver, Expense, FuelLog, MaintenanceLog, Notification, Trip, User, Vehicle, VehicleLocation } from "@prisma/client";

const num = (v: unknown) => v == null ? undefined : Number(v);
const iso = (d?: Date | null) => d ? d.toISOString() : undefined;

export function userDto(user: User & { roles?: { role: { name: string } }[] }) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: (user.roles?.[0]?.role.name ?? "dispatcher") as string,
    status: user.status,
    lastLoginAt: iso(user.lastLoginAt),
    avatarUrl: user.avatarUrl ?? null
  };
}

export function vehicleDto(v: Vehicle) {
  return {
    id: v.id, registrationNumber: v.registrationNumber, modelName: v.modelName, type: v.type, region: v.region,
    maxCapacityKg: v.maxCapacityKg, odometerKm: v.odometerKm, acquisitionCost: Number(v.acquisitionCost),
    fuelType: v.fuelType, manufacturingYear: v.manufacturingYear, status: v.status,
    lastServiceDate: iso(v.lastServiceDate), notes: v.notes ?? undefined, createdAt: v.createdAt.toISOString()
  };
}

export function driverDto(d: Driver & { trips?: Trip[] }) {
  const completed = d.trips?.filter((t) => t.status === "completed").length ?? 0;
  const terminal = d.trips?.filter((t) => t.status === "completed" || t.status === "cancelled").length ?? 0;
  return {
    id: d.id, fullName: d.fullName, licenceNumber: d.licenceNumber, licenceCategory: d.licenceCategory,
    licenceExpiry: d.licenceExpiry.toISOString(), contactNumber: d.contactNumber, email: d.email ?? undefined,
    safetyScore: d.safetyScore, tripCompletionRate: terminal ? (completed / terminal) * 100 : 0,
    status: d.status, region: d.region, emergencyContact: d.emergencyContact ?? undefined,
    notes: d.notes ?? undefined, createdAt: d.createdAt.toISOString()
  };
}

export function tripDto(t: Trip) {
  return {
    id: t.id, tripNumber: t.tripNumber, source: t.source, destination: t.destination,
    sourceCoords: t.sourceLat == null || t.sourceLng == null ? undefined : { lat: Number(t.sourceLat), lng: Number(t.sourceLng) },
    destinationCoords: t.destinationLat == null || t.destinationLng == null ? undefined : { lat: Number(t.destinationLat), lng: Number(t.destinationLng) },
    region: t.region, vehicleId: t.vehicleId, driverId: t.driverId, cargoWeightKg: t.cargoWeightKg,
    cargoDescription: t.cargoDescription ?? undefined, plannedDistanceKm: Number(t.plannedDistanceKm),
    actualDistanceKm: num(t.actualDistanceKm), plannedDepartureAt: t.plannedDepartureAt.toISOString(),
    dispatchedAt: iso(t.dispatchedAt), completedAt: iso(t.completedAt), cancelledAt: iso(t.cancelledAt),
    cancellationReason: t.cancellationReason ?? undefined, expectedRevenue: Number(t.expectedRevenue),
    startingOdometerKm: t.startingOdometerKm ?? undefined, finalOdometerKm: t.finalOdometerKm ?? undefined,
    fuelConsumedLitres: num(t.fuelConsumedLitres), fuelCost: num(t.fuelCost), additionalExpense: num(t.additionalExpense),
    notes: t.notes ?? undefined, status: t.status, createdAt: t.createdAt.toISOString()
  };
}

export function maintenanceDto(m: MaintenanceLog) {
  return {
    id: m.id, maintenanceNumber: m.maintenanceNumber, vehicleId: m.vehicleId, serviceType: m.serviceType,
    description: m.description, priority: m.priority, startDate: m.startDate.toISOString(),
    expectedCompletionDate: m.expectedCompletionDate.toISOString(), completionDate: iso(m.completionDate),
    cost: Number(m.cost), finalCost: num(m.finalCost), serviceProvider: m.serviceProvider,
    odometerAtService: m.odometerAtService, workPerformed: m.workPerformed ?? undefined,
    nextServiceDate: iso(m.nextServiceDate), nextServiceOdometerKm: m.nextServiceOdometerKm ?? undefined,
    status: m.status, notes: m.notes ?? undefined, createdAt: m.createdAt.toISOString()
  };
}

export const fuelDto = (f: FuelLog) => ({
  id: f.id, vehicleId: f.vehicleId, tripId: f.tripId ?? undefined, date: f.date.toISOString(),
  litres: Number(f.litres), totalCost: Number(f.totalCost), odometerKm: f.odometerKm,
  fuelStation: f.fuelStation ?? undefined, receiptRef: f.receiptRef ?? undefined, notes: f.notes ?? undefined,
  createdAt: f.createdAt.toISOString()
});

export const expenseDto = (e: Expense) => ({
  id: e.id, expenseNumber: e.expenseNumber, vehicleId: e.vehicleId, tripId: e.tripId ?? undefined,
  category: e.category, description: e.description, amount: Number(e.amount), expenseDate: e.expenseDate.toISOString(),
  receiptRef: e.receiptRef ?? undefined, notes: e.notes ?? undefined, createdAt: e.createdAt.toISOString()
});

export const notificationDto = (n: Notification) => ({
  id: n.id, type: n.type, title: n.title, message: n.message, read: n.read,
  relatedId: n.relatedId ?? undefined, relatedType: n.relatedType ?? undefined, createdAt: n.createdAt.toISOString()
});

export const locationDto = (l: VehicleLocation & { vehicle?: Vehicle }) => ({
  vehicleId: l.vehicleId, registrationNumber: l.registrationNumber, latitude: Number(l.latitude),
  longitude: Number(l.longitude), heading: l.heading ?? undefined, speedKph: num(l.speedKph),
  status: l.vehicle?.status ?? "available", tripId: l.tripId ?? undefined, updatedAt: l.updatedAt.toISOString()
});

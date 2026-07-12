import { prisma } from "../src/db.js";
import { hashPassword } from "../src/auth.js";

const DEV_PASSWORD = "TransitOps@2026";
const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000);
const daysFromNow = (n: number) => new Date(now.getTime() + n * 86400000);

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.vehicleLocation.deleteMany();
  await prisma.vehicleDocument.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.fuelLog.deleteMany();
  await prisma.maintenanceLog.deleteMany();
  await prisma.tripStatusHistory.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.refreshSession.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.region.deleteMany();
  await prisma.vehicleType.deleteMany();
  await prisma.licenceCategory.deleteMany();
  await prisma.organizationSettings.deleteMany();

  await prisma.organizationSettings.create({ data: { organizationName: "Gandhinagar Depot", currency: "INR", distanceUnit: "kilometres", weightUnit: "kilograms", timezone: "Asia/Kolkata", dateFormat: "dd MMM yyyy" } });
  await prisma.region.createMany({ data: [{ code: "west", name: "West" }, { code: "north", name: "North" }, { code: "south", name: "South" }, { code: "east", name: "East" }, { code: "central", name: "Central" }] });
  await prisma.vehicleType.createMany({ data: [{ code: "van", name: "Van" }, { code: "truck", name: "Truck" }, { code: "mini_truck", name: "Mini Truck" }, { code: "trailer", name: "Trailer" }, { code: "pickup", name: "Pickup" }] });
  await prisma.licenceCategory.createMany({ data: [{ code: "LMV", name: "LMV" }, { code: "HMV", name: "HMV" }, { code: "HGV", name: "HGV" }, { code: "PSV", name: "PSV" }, { code: "TRANS", name: "TRANS" }] });

  const permissions = ["dashboard:view", "fleet:manage", "drivers:manage", "trips:operate", "maintenance:manage", "fuel_expenses:manage", "analytics:view", "settings:admin"];
  for (const code of permissions) await prisma.permission.create({ data: { code, description: code } });
  const roleNames = ["admin", "fleet_manager", "dispatcher", "safety_officer", "financial_analyst"] as const;
  for (const name of roleNames) await prisma.role.create({ data: { name } });
  const allPerms = await prisma.permission.findMany();
  for (const role of await prisma.role.findMany()) {
    const allowed = role.name === "admin" ? allPerms : allPerms.filter((p) => {
      if (role.name === "dispatcher") return ["dashboard:view", "trips:operate", "fuel_expenses:manage", "analytics:view"].includes(p.code);
      if (role.name === "fleet_manager") return ["dashboard:view", "fleet:manage", "maintenance:manage", "analytics:view"].includes(p.code);
      if (role.name === "safety_officer") return ["dashboard:view", "drivers:manage", "analytics:view"].includes(p.code);
      return ["dashboard:view", "fuel_expenses:manage", "analytics:view"].includes(p.code);
    });
    await prisma.rolePermission.createMany({ data: allowed.map((p) => ({ roleId: role.id, permissionId: p.id })) });
  }

  const passwordHash = await hashPassword(DEV_PASSWORD);
  const users = [
    ["Priya Sharma", "admin@transitops.in", "admin"],
    ["Rahul Verma", "fleet.manager@transitops.in", "fleet_manager"],
    ["Neha Patel", "dispatcher@transitops.in", "dispatcher"],
    ["Karan Singh", "safety@transitops.in", "safety_officer"],
    ["Ananya Iyer", "finance@transitops.in", "financial_analyst"]
  ] as const;
  for (const [name, email, roleName] of users) {
    const user = await prisma.user.create({ data: { name, email, passwordHash, status: "active" } });
    const role = await prisma.role.findUniqueOrThrow({ where: { name: roleName } });
    await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
  }

  const vehicles = await Promise.all([
    prisma.vehicle.create({ data: { registrationNumber: "VAN-05", modelName: "Tata Ace Gold", type: "van", region: "west", maxCapacityKg: 500, odometerKm: 42350, acquisitionCost: 750000, fuelType: "diesel", manufacturingYear: 2022, status: "available", lastServiceDate: daysAgo(45) } }),
    prisma.vehicle.create({ data: { registrationNumber: "TRUCK-11", modelName: "Ashok Leyland Dost+", type: "truck", region: "west", maxCapacityKg: 1500, odometerKm: 87200, acquisitionCost: 1450000, fuelType: "diesel", manufacturingYear: 2021, status: "on_trip", lastServiceDate: daysAgo(20) } }),
    prisma.vehicle.create({ data: { registrationNumber: "MINI-03", modelName: "Mahindra Bolero Pik-Up", type: "mini_truck", region: "north", maxCapacityKg: 1200, odometerKm: 65400, acquisitionCost: 1100000, fuelType: "diesel", manufacturingYear: 2020, status: "in_shop" } }),
    prisma.vehicle.create({ data: { registrationNumber: "OLD-99", modelName: "Tata 407", type: "truck", region: "central", maxCapacityKg: 2500, odometerKm: 320450, acquisitionCost: 900000, fuelType: "diesel", manufacturingYear: 2012, status: "retired" } }),
    prisma.vehicle.create({ data: { registrationNumber: "PICK-22", modelName: "Isuzu D-Max", type: "pickup", region: "south", maxCapacityKg: 800, odometerKm: 28100, acquisitionCost: 1750000, fuelType: "diesel", manufacturingYear: 2023, status: "available" } }),
    prisma.vehicle.create({ data: { registrationNumber: "TRL-07", modelName: "BharatBenz 4928T", type: "trailer", region: "east", maxCapacityKg: 25000, odometerKm: 145000, acquisitionCost: 4200000, fuelType: "diesel", manufacturingYear: 2019, status: "available" } })
  ]);
  const [van, truck, mini, old, pick, trailer] = vehicles;

  const drivers = await Promise.all([
    prisma.driver.create({ data: { fullName: "Alex Fernandes", licenceNumber: "GJ0120210001234", licenceCategory: "LMV", licenceExpiry: daysFromNow(200), contactNumber: "+91 98250 11111", email: "alex@example.com", safetyScore: 92, status: "available", region: "west" } }),
    prisma.driver.create({ data: { fullName: "Ramesh Bhai", licenceNumber: "GJ0120180005678", licenceCategory: "HMV", licenceExpiry: daysFromNow(15), contactNumber: "+91 98250 22222", safetyScore: 85, status: "on_trip", region: "west" } }),
    prisma.driver.create({ data: { fullName: "Suresh Kumar", licenceNumber: "MH0220150009999", licenceCategory: "HGV", licenceExpiry: daysAgo(60), contactNumber: "+91 98220 33333", safetyScore: 78, status: "available", region: "west", notes: "Licence has expired; renewal pending." } }),
    prisma.driver.create({ data: { fullName: "Vikram Chauhan", licenceNumber: "DL0320190004321", licenceCategory: "HMV", licenceExpiry: daysFromNow(400), contactNumber: "+91 98110 44444", safetyScore: 62, status: "suspended", region: "north" } }),
    prisma.driver.create({ data: { fullName: "Priyanka Rao", licenceNumber: "KA0220200007890", licenceCategory: "LMV", licenceExpiry: daysFromNow(600), contactNumber: "+91 98450 55555", safetyScore: 95, status: "off_duty", region: "south" } }),
    prisma.driver.create({ data: { fullName: "Mohammed Aslam", licenceNumber: "TN0120170001111", licenceCategory: "TRANS", licenceExpiry: daysFromNow(90), contactNumber: "+91 98400 66666", safetyScore: 88, status: "available", region: "east" } })
  ]);
  const [alex, ramesh, , , priyanka, aslam] = drivers;

  await prisma.trip.create({ data: { tripNumber: "TR-000001", source: "Ahmedabad Hub", destination: "Surat Depot", sourceLat: 23.0225, sourceLng: 72.5714, destinationLat: 21.1702, destinationLng: 72.8311, region: "west", vehicleId: truck.id, driverId: ramesh.id, cargoWeightKg: 1200, plannedDistanceKm: 265, plannedDepartureAt: daysAgo(0), dispatchedAt: daysAgo(0), expectedRevenue: 32000, status: "dispatched", startingOdometerKm: 87200 } });
  await prisma.trip.create({ data: { tripNumber: "TR-000002", source: "Gandhinagar Depot", destination: "Ahmedabad Hub", sourceLat: 23.2156, sourceLng: 72.6369, destinationLat: 23.0225, destinationLng: 72.5714, region: "west", vehicleId: van.id, driverId: alex.id, cargoWeightKg: 450, plannedDistanceKm: 32, plannedDepartureAt: daysFromNow(1), expectedRevenue: 4500, status: "draft" } });
  const completed = await prisma.trip.create({ data: { tripNumber: "TR-000003", source: "Mumbai Port", destination: "Pune Warehouse", region: "west", vehicleId: trailer.id, driverId: aslam.id, cargoWeightKg: 22000, plannedDistanceKm: 150, plannedDepartureAt: daysAgo(3), dispatchedAt: daysAgo(3), completedAt: daysAgo(2), actualDistanceKm: 152, startingOdometerKm: 144848, finalOdometerKm: 145000, fuelConsumedLitres: 55, fuelCost: 5500, expectedRevenue: 48000, status: "completed" } });
  await prisma.trip.create({ data: { tripNumber: "TR-000004", source: "Bengaluru Hub", destination: "Mysuru Depot", region: "south", vehicleId: pick.id, driverId: priyanka.id, cargoWeightKg: 600, plannedDistanceKm: 145, plannedDepartureAt: daysAgo(5), cancelledAt: daysAgo(5), cancellationReason: "Customer cancelled shipment.", expectedRevenue: 12000, status: "cancelled" } });

  await prisma.maintenanceLog.create({ data: { maintenanceNumber: "MT-000001", vehicleId: mini.id, serviceType: "engine_repair", description: "Coolant leak and overheating diagnostics.", priority: "high", startDate: daysAgo(5), expectedCompletionDate: daysFromNow(2), cost: 45000, serviceProvider: "Mahindra Authorized Service, Delhi", odometerAtService: 65400, status: "in_progress" } });
  await prisma.maintenanceLog.create({ data: { maintenanceNumber: "MT-000002", vehicleId: pick.id, serviceType: "oil_change", description: "Scheduled 30k km service.", priority: "low", startDate: daysAgo(60), expectedCompletionDate: daysAgo(59), completionDate: daysAgo(59), cost: 6500, finalCost: 6200, serviceProvider: "Isuzu Care, Bengaluru", odometerAtService: 28100, workPerformed: "Engine oil, oil filter, air filter replacement.", nextServiceDate: daysFromNow(120), nextServiceOdometerKm: 38100, status: "completed" } });
  await prisma.fuelLog.createMany({ data: [{ vehicleId: trailer.id, tripId: completed.id, date: daysAgo(2), litres: 55, totalCost: 5500, odometerKm: 145000, fuelStation: "IOC Vashi" }, { vehicleId: van.id, date: daysAgo(10), litres: 22, totalCost: 2100, odometerKm: 42250, fuelStation: "HP Gandhinagar" }, { vehicleId: trailer.id, date: daysAgo(20), litres: 120, totalCost: 12500, odometerKm: 144500, fuelStation: "BP Nashik" }] });
  await prisma.expense.createMany({ data: [{ expenseNumber: "EX-000001", vehicleId: trailer.id, tripId: completed.id, category: "toll", description: "Mumbai-Pune expressway toll", amount: 850, expenseDate: daysAgo(3) }, { expenseNumber: "EX-000002", vehicleId: mini.id, category: "repair", description: "Emergency tow", amount: 3500, expenseDate: daysAgo(5) }, { expenseNumber: "EX-000003", vehicleId: van.id, category: "parking", description: "Overnight parking", amount: 200, expenseDate: daysAgo(1) }] });
  await prisma.notification.createMany({ data: [{ type: "licence_expired", title: "Driver licence expired", message: "Suresh Kumar's licence expired 60 days ago.", relatedId: drivers[2].id, relatedType: "driver" }, { type: "licence_expiring", title: "Licence expiring soon", message: "Ramesh Bhai's licence expires in 15 days.", relatedId: ramesh.id, relatedType: "driver" }, { type: "vehicle_in_shop", title: "Vehicle in maintenance", message: "MINI-03 moved to In Shop for engine repair.", read: true, relatedId: mini.id, relatedType: "vehicle" }] });
  await prisma.vehicleLocation.createMany({ data: [{ vehicleId: van.id, registrationNumber: "VAN-05", latitude: 23.2156, longitude: 72.6369 }, { vehicleId: truck.id, registrationNumber: "TRUCK-11", latitude: 22.5, longitude: 72.9, speedKph: 62, heading: 180 }, { vehicleId: mini.id, registrationNumber: "MINI-03", latitude: 28.6, longitude: 77.2 }, { vehicleId: pick.id, registrationNumber: "PICK-22", latitude: 12.97, longitude: 77.59 }, { vehicleId: trailer.id, registrationNumber: "TRL-07", latitude: 19.076, longitude: 72.877 }] });

  console.log(`Seeded TransitOps demo data. Development password: ${DEV_PASSWORD}`);
}

main().finally(() => prisma.$disconnect());

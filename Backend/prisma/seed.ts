import { prisma } from "../src/db.js";
import { hashPassword } from "../src/auth.js";

const DEV_PASSWORD = "demo1234";
const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000);
const daysFromNow = (n: number) => new Date(now.getTime() + n * 86400000);

const regions = ["west", "north", "south", "east", "central"];
const vehicleTypes = ["van", "truck", "mini_truck", "trailer", "pickup"] as const;
const fuelTypes = ["diesel", "petrol", "cng", "electric"] as const;
const licenceCategories = ["LMV", "HMV", "HGV", "PSV", "TRANS"] as const;
const serviceTypes = [
  "oil_change",
  "tyre_replacement",
  "engine_repair",
  "brake_service",
  "battery_replacement",
  "general_inspection",
  "other",
] as const;
const expenseCategories = ["toll", "parking", "permit", "repair", "fine", "other"] as const;

function pick<T>(items: readonly T[], index: number): T {
  return items[index % items.length];
}

async function reset() {
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
  await prisma.user.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.region.deleteMany();
  await prisma.vehicleType.deleteMany();
  await prisma.licenceCategory.deleteMany();
  await prisma.organizationSettings.deleteMany();
}

async function seedMasterData() {
  await prisma.organizationSettings.create({
    data: {
      organizationName: "Gandhinagar Depot",
      currency: "INR",
      distanceUnit: "kilometres",
      weightUnit: "kilograms",
      timezone: "Asia/Kolkata",
      dateFormat: "dd MMM yyyy",
    },
  });

  await prisma.region.createMany({
    data: [
      { code: "west", name: "West" },
      { code: "north", name: "North" },
      { code: "south", name: "South" },
      { code: "east", name: "East" },
      { code: "central", name: "Central" },
    ],
  });
  await prisma.vehicleType.createMany({
    data: [
      { code: "van", name: "Van" },
      { code: "truck", name: "Truck" },
      { code: "mini_truck", name: "Mini Truck" },
      { code: "trailer", name: "Trailer" },
      { code: "pickup", name: "Pickup" },
    ],
  });
  await prisma.licenceCategory.createMany({
    data: licenceCategories.map((code) => ({ code, name: code })),
  });
}

async function seedAccess() {
  const permissions = [
    "dashboard:view",
    "fleet:manage",
    "drivers:manage",
    "trips:operate",
    "maintenance:manage",
    "fuel_expenses:manage",
    "analytics:view",
    "settings:admin",
  ];
  await prisma.permission.createMany({
    data: permissions.map((code) => ({ code, description: code })),
  });

  const roleNames = [
    "admin",
    "fleet_manager",
    "dispatcher",
    "safety_officer",
    "financial_analyst",
  ] as const;
  for (const name of roleNames) await prisma.role.create({ data: { name } });

  const allPerms = await prisma.permission.findMany();
  for (const role of await prisma.role.findMany()) {
    const allowed =
      role.name === "admin"
        ? allPerms
        : allPerms.filter((p) => {
            if (role.name === "dispatcher") {
              return ["dashboard:view", "trips:operate", "fuel_expenses:manage", "analytics:view"].includes(
                p.code,
              );
            }
            if (role.name === "fleet_manager") {
              return ["dashboard:view", "fleet:manage", "maintenance:manage", "analytics:view"].includes(
                p.code,
              );
            }
            if (role.name === "safety_officer") {
              return ["dashboard:view", "drivers:manage", "analytics:view"].includes(p.code);
            }
            return ["dashboard:view", "fuel_expenses:manage", "analytics:view"].includes(p.code);
          });
    await prisma.rolePermission.createMany({
      data: allowed.map((p) => ({ roleId: role.id, permissionId: p.id })),
    });
  }

  const passwordHash = await hashPassword(DEV_PASSWORD);
  const users = [
    ["Priya Sharma", "admin@transitops.dev", "admin"],
    ["Rahul Verma", "fleet@transitops.dev", "fleet_manager"],
    ["Neha Patel", "dispatch@transitops.dev", "dispatcher"],
    ["Karan Singh", "safety@transitops.dev", "safety_officer"],
    ["Ananya Iyer", "finance@transitops.dev", "financial_analyst"],
  ] as const;

  for (const [name, email, roleName] of users) {
    const user = await prisma.user.create({ data: { name, email, passwordHash, status: "active" } });
    const role = await prisma.role.findUniqueOrThrow({ where: { name: roleName } });
    await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
  }
}

async function seedFleet() {
  const vehicles = [];
  vehicles.push(
    await prisma.vehicle.create({
      data: {
        registrationNumber: "VAN-05",
        modelName: "Tata Ace Gold",
        type: "van",
        region: "west",
        maxCapacityKg: 500,
        odometerKm: 42350,
        acquisitionCost: 750000,
        fuelType: "diesel",
        manufacturingYear: 2022,
        status: "available",
        lastServiceDate: daysAgo(45),
      },
    }),
  );

  for (let i = 2; i <= 50; i += 1) {
    const type = pick(vehicleTypes, i);
    const capacity =
      type === "trailer" ? 24000 + i * 120 : type === "truck" ? 2200 + i * 35 : 500 + i * 25;
    vehicles.push(
      await prisma.vehicle.create({
        data: {
          registrationNumber: `${type.slice(0, 3).toUpperCase()}-${String(i).padStart(3, "0")}`,
          modelName: `${["Tata", "Ashok Leyland", "Mahindra", "BharatBenz", "Isuzu"][i % 5]} ${type.replace("_", " ")}`,
          type,
          region: pick(regions, i),
          maxCapacityKg: capacity,
          odometerKm: 12000 + i * 3450,
          acquisitionCost: 650000 + i * 85000,
          fuelType: pick(fuelTypes, i),
          manufacturingYear: 2017 + (i % 8),
          status: i === 2 ? "on_trip" : i === 3 ? "in_shop" : i === 4 ? "retired" : "available",
          lastServiceDate: daysAgo(20 + (i % 80)),
        },
      }),
    );
  }

  const drivers = [];
  drivers.push(
    await prisma.driver.create({
      data: {
        fullName: "Alex Fernandes",
        licenceNumber: "GJ0120210001234",
        licenceCategory: "LMV",
        licenceExpiry: daysFromNow(200),
        contactNumber: "+91 98250 11111",
        email: "alex@example.com",
        safetyScore: 92,
        status: "available",
        region: "west",
      },
    }),
  );

  const names = [
    "Ramesh Bhai",
    "Suresh Kumar",
    "Vikram Chauhan",
    "Priyanka Rao",
    "Mohammed Aslam",
    "Meera Shah",
    "Nikhil Desai",
    "Farhan Khan",
    "Anil Yadav",
    "Lakshmi Menon",
  ];
  for (let i = 2; i <= 100; i += 1) {
    drivers.push(
      await prisma.driver.create({
        data: {
          fullName: `${pick(names, i)} ${i}`,
          licenceNumber: `DL${String(i).padStart(2, "0")}2020${String(1000000 + i)}`,
          licenceCategory: pick(licenceCategories, i),
          licenceExpiry: i === 3 ? daysAgo(60) : daysFromNow(30 + (i % 900)),
          contactNumber: `+91 98${String(20000000 + i).padStart(8, "0")}`,
          email: i % 4 === 0 ? `driver${i}@example.com` : undefined,
          safetyScore: 55 + (i % 46),
          status: i === 2 ? "on_trip" : i === 4 ? "suspended" : i === 5 ? "off_duty" : "available",
          region: pick(regions, i),
          notes: i === 3 ? "Licence renewal pending." : undefined,
        },
      }),
    );
  }

  await prisma.trip.create({
    data: {
      tripNumber: "TR-000001",
      source: "Ahmedabad Hub",
      destination: "Surat Depot",
      sourceLat: 23.0225,
      sourceLng: 72.5714,
      destinationLat: 21.1702,
      destinationLng: 72.8311,
      region: "west",
      vehicleId: vehicles[1].id,
      driverId: drivers[1].id,
      cargoWeightKg: 1200,
      plannedDistanceKm: 265,
      plannedDepartureAt: daysAgo(0),
      dispatchedAt: daysAgo(0),
      expectedRevenue: 32000,
      status: "dispatched",
      startingOdometerKm: vehicles[1].odometerKm,
    },
  });

  await prisma.trip.create({
    data: {
      tripNumber: "TR-000002",
      source: "Gandhinagar Depot",
      destination: "Ahmedabad Hub",
      sourceLat: 23.2156,
      sourceLng: 72.6369,
      destinationLat: 23.0225,
      destinationLng: 72.5714,
      region: "west",
      vehicleId: vehicles[0].id,
      driverId: drivers[0].id,
      cargoWeightKg: 450,
      plannedDistanceKm: 32,
      plannedDepartureAt: daysFromNow(1),
      expectedRevenue: 4500,
      status: "draft",
    },
  });

  for (let i = 3; i <= 300; i += 1) {
    const vehicle = vehicles[(i % (vehicles.length - 5)) + 5];
    const driver = drivers[(i % (drivers.length - 6)) + 6];
    const planned = 45 + (i % 420);
    const completed = i % 5 !== 0;
    const cancelled = i % 11 === 0;
    const status = cancelled ? "cancelled" : completed ? "completed" : "draft";
    const actual = completed ? planned + (i % 17) - 6 : undefined;
    const departure = daysAgo(1 + (i % 180));
    await prisma.trip.create({
      data: {
        tripNumber: `TR-${String(i).padStart(6, "0")}`,
        source: pick(["Gandhinagar Depot", "Ahmedabad Hub", "Mumbai Port", "Delhi Yard", "Bengaluru Hub"], i),
        destination: pick(["Surat Depot", "Pune Warehouse", "Jaipur DC", "Mysuru Depot", "Nagpur Hub"], i + 2),
        region: vehicle.region,
        vehicleId: vehicle.id,
        driverId: driver.id,
        cargoWeightKg: Math.min(vehicle.maxCapacityKg - 50, 250 + (i % 1800)),
        cargoDescription: `Commercial shipment ${i}`,
        plannedDistanceKm: planned,
        actualDistanceKm: actual,
        plannedDepartureAt: departure,
        dispatchedAt: status === "completed" || status === "cancelled" ? departure : undefined,
        completedAt: status === "completed" ? daysAgo(i % 170) : undefined,
        cancelledAt: status === "cancelled" ? daysAgo(i % 170) : undefined,
        cancellationReason: status === "cancelled" ? "Customer rescheduled shipment." : undefined,
        expectedRevenue: 3500 + planned * 115,
        startingOdometerKm: status === "completed" ? vehicle.odometerKm - planned - (i % 80) : undefined,
        finalOdometerKm: status === "completed" ? vehicle.odometerKm - (i % 80) : undefined,
        fuelConsumedLitres: status === "completed" ? Math.max(8, Math.round(planned / 5)) : undefined,
        fuelCost: status === "completed" ? Math.max(800, Math.round((planned / 5) * 96)) : undefined,
        additionalExpense: i % 9 === 0 ? 500 + (i % 7) * 150 : undefined,
        status,
        createdAt: daysAgo(i % 200),
      },
    });
  }

  const completedTrips = await prisma.trip.findMany({ where: { status: "completed" } });
  for (let i = 0; i < completedTrips.length; i += 1) {
    const trip = completedTrips[i];
    await prisma.fuelLog.create({
      data: {
        vehicleId: trip.vehicleId,
        tripId: trip.id,
        date: trip.completedAt ?? daysAgo(i % 180),
        litres: trip.fuelConsumedLitres ?? 20 + (i % 70),
        totalCost: trip.fuelCost ?? 1800 + (i % 60) * 95,
        odometerKm: trip.finalOdometerKm ?? 20000 + i * 300,
        fuelStation: pick(["IOC", "HP", "BP", "Reliance"], i),
      },
    });
    if (i % 2 === 0) {
      await prisma.expense.create({
        data: {
          expenseNumber: `EX-${String(i + 1).padStart(6, "0")}`,
          vehicleId: trip.vehicleId,
          tripId: trip.id,
          category: pick(expenseCategories, i),
          description: `Trip operating expense ${i + 1}`,
          amount: 200 + (i % 25) * 85,
          expenseDate: trip.completedAt ?? daysAgo(i % 180),
        },
      });
    }
  }

  for (let i = 0; i < 80; i += 1) {
    const vehicle = vehicles[i % vehicles.length];
    const active = i === 0 || i === 1 || i === 2;
    await prisma.maintenanceLog.create({
      data: {
        maintenanceNumber: `MT-${String(i + 1).padStart(6, "0")}`,
        vehicleId: i === 0 ? vehicles[2].id : vehicle.id,
        serviceType: pick(serviceTypes, i),
        description: `Scheduled service record ${i + 1}`,
        priority: i % 13 === 0 ? "critical" : i % 5 === 0 ? "high" : "medium",
        startDate: daysAgo(2 + i * 2),
        expectedCompletionDate: active ? daysFromNow(2 + i) : daysAgo(1 + i),
        completionDate: active ? undefined : daysAgo(i),
        cost: 2500 + (i % 20) * 1250,
        finalCost: active ? undefined : 2300 + (i % 20) * 1200,
        serviceProvider: pick(["Internal Workshop", "Tata Motors Service", "Mahindra Care", "BharatBenz Hub"], i),
        odometerAtService: vehicle.odometerKm,
        workPerformed: active ? undefined : "Inspection, replacement and road test completed.",
        nextServiceDate: active ? undefined : daysFromNow(90 + i),
        nextServiceOdometerKm: active ? undefined : vehicle.odometerKm + 10000,
        status: active ? "in_progress" : "completed",
      },
    });
  }

  await prisma.vehicle.update({ where: { id: vehicles[2].id }, data: { status: "in_shop" } });

  await prisma.notification.createMany({
    data: [
      {
        type: "licence_expired",
        title: "Driver licence expired",
        message: "Driver 3 has an expired licence and cannot be dispatched.",
        relatedId: drivers[2].id,
        relatedType: "driver",
      },
      {
        type: "licence_expiring",
        title: "Licence expiring soon",
        message: "Several driver licences expire in the next 30 days.",
        relatedType: "driver",
      },
      {
        type: "vehicle_in_shop",
        title: "Vehicle in maintenance",
        message: "MINI-003 moved to In Shop for active maintenance.",
        read: true,
        relatedId: vehicles[2].id,
        relatedType: "vehicle",
      },
      ...Array.from({ length: 40 }, (_, i) => ({
        type: pick(["trip_completed", "fuel_logged", "maintenance_due", "high_cost_alert"] as const, i),
        title: `Operations alert ${i + 1}`,
        message: `Operational event ${i + 1} requires review.`,
        read: i % 3 === 0,
        relatedType: pick(["vehicle", "driver", "trip", "maintenance"] as const, i),
      })),
    ],
  });

  for (let i = 0; i < 25; i += 1) {
    const vehicle = vehicles[i];
    await prisma.vehicleDocument.create({
      data: {
        vehicleId: vehicle.id,
        originalName: `registration-${vehicle.registrationNumber}.pdf`,
        storedName: `seed-registration-${vehicle.id}.pdf`,
        mimeType: "application/pdf",
        size: 128000 + i * 512,
        documentType: "registration",
        documentNumber: `REG-${vehicle.registrationNumber}`,
        issueDate: daysAgo(700 + i),
        expiryDate: daysFromNow(365 + i),
        storagePath: `uploads/seed-registration-${vehicle.id}.pdf`,
      },
    });
  }

  await prisma.vehicleLocation.createMany({
    data: vehicles
      .filter((v) => v.status !== "retired")
      .slice(0, 40)
      .map((v, i) => ({
        vehicleId: v.id,
        registrationNumber: v.registrationNumber,
        latitude: 12.9 + (i % 15) * 0.71,
        longitude: 72.4 + (i % 10) * 0.63,
        speedKph: v.status === "on_trip" ? 58 : 0,
        heading: (i * 23) % 360,
      })),
  });

  return { vehicles: vehicles.length, drivers: drivers.length };
}

async function main() {
  await reset();
  await seedMasterData();
  await seedAccess();
  const counts = await seedFleet();
  console.log(
    `Seeded TransitOps data: ${counts.vehicles} vehicles, ${counts.drivers} drivers, 300 trips. Development password: ${DEV_PASSWORD}`,
  );
}

main().finally(() => prisma.$disconnect());

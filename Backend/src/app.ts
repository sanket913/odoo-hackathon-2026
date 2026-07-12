import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import multer from "multer";
import { stringify } from "csv-stringify/sync";
import swaggerUi from "swagger-ui-express";
import { z } from "zod";
import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "./db.js";
import { corsOrigins, env } from "./config/env.js";
import { ApiError, asyncHandler, errorHandler, ok, paged } from "./errors.js";
import {
  audit,
  currentUser,
  hashPassword,
  hashToken,
  makeRefreshToken,
  REFRESH_COOKIE,
  refreshCookieOptions,
  requireRole,
  signAccessToken,
  verifyPassword,
} from "./auth.js";
import {
  driverDto,
  expenseDto,
  fuelDto,
  locationDto,
  maintenanceDto,
  notificationDto,
  tripDto,
  userDto,
  vehicleDto,
} from "./dto.js";

const app = express();
app.use(helmet());
app.use(
  cors({
    origin: (origin, cb) =>
      !origin || corsOrigins.includes(origin)
        ? cb(null, true)
        : cb(new Error("CORS blocked")),
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(
  (pinoHttp as unknown as (opts: object) => express.RequestHandler)({
    level: env.LOG_LEVEL,
  }),
);
app.use((req, res, next) => {
  req.correlationId = req.get("x-correlation-id") ?? crypto.randomUUID();
  res.setHeader("x-correlation-id", req.correlationId);
  next();
});

const api = express.Router();
const authLimit = rateLimit({
  windowMs: 15 * 60_000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});
const apiLimit = rateLimit({
  windowMs: 60_000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
api.use(apiLimit);

const pageSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(100),
});
const idParam = z.object({ id: z.string().min(1) });
const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((v) => v || undefined);

function pickPaging(query: unknown) {
  const { page, limit } = pageSchema.parse(query);
  return { page, limit, skip: (page - 1) * limit };
}

async function nextNumber(
  tx: PrismaClient | Prisma.TransactionClient,
  model: "trip" | "maintenanceLog" | "expense",
  field: "tripNumber" | "maintenanceNumber" | "expenseNumber",
  prefix: string,
) {
  const rows = await (tx[model] as any).findMany({
    select: { [field]: true },
    where: { [field]: { startsWith: prefix } },
    orderBy: { [field]: "desc" },
    take: 1,
  });
  const current = rows[0]?.[field]
    ? Number(String(rows[0][field]).replace(prefix, ""))
    : 0;
  return `${prefix}${String((Number.isFinite(current) ? current : 0) + 1).padStart(6, "0")}`;
}

function notify(
  tx: PrismaClient | Prisma.TransactionClient,
  type: any,
  title: string,
  message: string,
  relatedId?: string,
  relatedType?: string,
) {
  return tx.notification.create({
    data: { type, title, message, relatedId, relatedType },
  });
}

async function ensureDevelopmentDemoUser(email: string) {
  if (env.NODE_ENV === "production" || !email.endsWith("@transitops.dev"))
    return null;
  const roles: Record<
    string,
    {
      name: string;
      role:
        | "admin"
        | "fleet_manager"
        | "dispatcher"
        | "safety_officer"
        | "financial_analyst";
    }
  > = {
    "admin@transitops.dev": { name: "Priya Sharma", role: "admin" },
    "fleet@transitops.dev": { name: "Rahul Verma", role: "fleet_manager" },
    "dispatch@transitops.dev": { name: "Neha Patel", role: "dispatcher" },
    "safety@transitops.dev": { name: "Karan Singh", role: "safety_officer" },
    "finance@transitops.dev": {
      name: "Ananya Iyer",
      role: "financial_analyst",
    },
  };
  const demo = roles[email];
  if (!demo) return null;
  const role = await prisma.role.upsert({
    where: { name: demo.role },
    update: {},
    create: { name: demo.role },
  });
  return prisma.user.upsert({
    where: { email },
    update: { status: "active" },
    create: {
      name: demo.name,
      email,
      passwordHash: await hashPassword("demo1234"),
      status: "active",
      roles: { create: { roleId: role.id } },
    },
    include: { roles: { include: { role: true } } },
  });
}

const vehicleCreate = z.object({
  registrationNumber: z.string().min(1),
  modelName: z.string().min(1),
  type: z.enum(["van", "truck", "mini_truck", "trailer", "pickup"]),
  region: z.string().min(1),
  maxCapacityKg: z.coerce.number().int().positive(),
  odometerKm: z.coerce.number().int().min(0).default(0),
  acquisitionCost: z.coerce.number().min(0),
  fuelType: z.enum(["diesel", "petrol", "cng", "electric"]),
  manufacturingYear: z.coerce
    .number()
    .int()
    .min(1990)
    .max(new Date().getFullYear() + 1),
  status: z
    .enum(["available", "on_trip", "in_shop", "retired"])
    .default("available"),
  lastServiceDate: optionalString,
  notes: optionalString,
});
const driverCreate = z.object({
  fullName: z.string().min(1),
  licenceNumber: z.string().min(1),
  licenceCategory: z.enum(["LMV", "HMV", "HGV", "PSV", "TRANS"]),
  licenceExpiry: z.coerce.date(),
  contactNumber: z.string().min(5),
  email: optionalString,
  status: z
    .enum(["available", "on_trip", "off_duty", "suspended"])
    .default("available"),
  region: z.string().min(1),
  emergencyContact: optionalString,
  notes: optionalString,
});

function calculateDriverSafetyScore(input: {
  licenceExpiry: Date;
  licenceCategory: string;
  contactNumber: string;
  email?: string | null;
  emergencyContact?: string | null;
  status?: string | null;
}) {
  let score = 100;
  const today = new Date();
  const daysUntilExpiry = Math.ceil(
    (input.licenceExpiry.getTime() - today.getTime()) / 86400000,
  );

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
const tripCreate = z.object({
  source: z.string().min(1),
  destination: z.string().min(1),
  sourceCoords: z.object({ lat: z.number(), lng: z.number() }).optional(),
  destinationCoords: z.object({ lat: z.number(), lng: z.number() }).optional(),
  region: z.string().min(1),
  vehicleId: z.string().min(1),
  driverId: z.string().min(1),
  cargoWeightKg: z.coerce.number().int().positive(),
  cargoDescription: optionalString,
  plannedDistanceKm: z.coerce.number().positive(),
  plannedDepartureAt: z.coerce.date(),
  expectedRevenue: z.coerce.number().min(0),
  notes: optionalString,
});
const maintenanceCreate = z.object({
  vehicleId: z.string().min(1),
  serviceType: z.enum([
    "oil_change",
    "tyre_replacement",
    "engine_repair",
    "brake_service",
    "battery_replacement",
    "general_inspection",
    "other",
  ]),
  description: z.string().min(1),
  priority: z.enum(["low", "medium", "high", "critical"]),
  startDate: z.coerce.date(),
  expectedCompletionDate: z.coerce.date(),
  cost: z.coerce.number().min(0),
  serviceProvider: z.string().default("Internal workshop"),
  odometerAtService: z.coerce.number().int().min(0),
  status: z
    .enum(["open", "in_progress", "completed", "cancelled"])
    .default("open"),
  notes: optionalString,
});
const fuelCreate = z.object({
  vehicleId: z.string(),
  tripId: optionalString,
  date: z.coerce.date(),
  litres: z.coerce.number().positive(),
  totalCost: z.coerce.number().min(0),
  odometerKm: z.coerce.number().int().min(0),
  fuelStation: optionalString,
  receiptRef: optionalString,
  notes: optionalString,
});
const expenseCreate = z.object({
  vehicleId: z.string(),
  tripId: optionalString,
  category: z.enum([
    "toll",
    "maintenance",
    "parking",
    "permit",
    "repair",
    "fine",
    "other",
  ]),
  description: z.string().min(1),
  amount: z.coerce.number().min(0),
  expenseDate: z.coerce.date(),
  receiptRef: optionalString,
  notes: optionalString,
});
const userCreate = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6).default("TransitOps@123"),
  role: z.enum([
    "admin",
    "fleet_manager",
    "dispatcher",
    "safety_officer",
    "financial_analyst",
  ]),
  status: z.enum(["active", "inactive"]).default("active"),
  avatarUrl: optionalString,
});
const userUpdate = userCreate
  .partial()
  .extend({ password: z.string().min(6).optional() });
const settingsUpdate = z.object({
  organizationName: z.string().min(1).optional(),
  currency: z.string().min(1).optional(),
  distanceUnit: z.string().min(1).optional(),
  weightUnit: z.string().min(1).optional(),
  timezone: z.string().min(1).optional(),
  dateFormat: z.string().min(1).optional(),
});

async function dispatchIssues(
  tx: PrismaClient | Prisma.TransactionClient,
  input: {
    tripId?: string;
    vehicleId?: string;
    driverId?: string;
    cargoWeightKg?: number;
    plannedDistanceKm?: number;
    source?: string;
    destination?: string;
  },
) {
  const issues: { code: string; message: string; field?: string }[] = [];
  const trip = input.tripId
    ? await tx.trip.findUnique({ where: { id: input.tripId } })
    : null;
  const vehicleId = input.vehicleId ?? trip?.vehicleId;
  const driverId = input.driverId ?? trip?.driverId;
  const cargoWeightKg = input.cargoWeightKg ?? trip?.cargoWeightKg;
  const plannedDistanceKm =
    input.plannedDistanceKm ??
    (trip ? Number(trip.plannedDistanceKm) : undefined);
  const source = input.source ?? trip?.source;
  const destination = input.destination ?? trip?.destination;
  if (input.tripId && !trip)
    issues.push({ code: "NOT_FOUND", message: "Trip not found." });
  if (trip && trip.status !== "draft")
    issues.push({
      code: "INVALID_TRANSITION",
      message: "Only draft trips can be dispatched.",
    });
  const [vehicle, driver] = await Promise.all([
    vehicleId ? tx.vehicle.findUnique({ where: { id: vehicleId } }) : null,
    driverId ? tx.driver.findUnique({ where: { id: driverId } }) : null,
  ]);
  if (!vehicle)
    issues.push({
      code: "NO_VEHICLE",
      message: "Select a vehicle.",
      field: "vehicleId",
    });
  else {
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
    if (vehicle.status === "on_trip")
      issues.push({
        code: "VEHICLE_ON_TRIP",
        message: `${vehicle.registrationNumber} is already on a trip.`,
        field: "vehicleId",
      });
    if (cargoWeightKg && cargoWeightKg > vehicle.maxCapacityKg)
      issues.push({
        code: "CAPACITY_EXCEEDED",
        message: `${vehicle.registrationNumber} supports ${vehicle.maxCapacityKg} kg; reduce cargo by ${cargoWeightKg - vehicle.maxCapacityKg} kg or select another vehicle.`,
        field: "cargoWeightKg",
      });
  }
  if (!driver)
    issues.push({
      code: "NO_DRIVER",
      message: "Select a driver.",
      field: "driverId",
    });
  else {
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
    if (driver.status === "on_trip")
      issues.push({
        code: "DRIVER_ON_TRIP",
        message: `${driver.fullName} is already on a trip.`,
        field: "driverId",
      });
    if (
      driver.licenceExpiry <
      new Date(
        new Date().toLocaleDateString("en-US", { timeZone: "Asia/Kolkata" }),
      )
    )
      issues.push({
        code: "DRIVER_EXPIRED_LICENCE",
        message: `${driver.fullName} cannot be assigned because the licence is expired.`,
        field: "driverId",
      });
  }
  if (!plannedDistanceKm || plannedDistanceKm <= 0)
    issues.push({
      code: "VALIDATION_ERROR",
      message: "Planned distance must be greater than zero.",
      field: "plannedDistanceKm",
    });
  if (!source?.trim() || !destination?.trim())
    issues.push({
      code: "VALIDATION_ERROR",
      message: "Source and destination are required.",
    });
  if (source?.trim().toLowerCase() === destination?.trim().toLowerCase())
    issues.push({
      code: "VALIDATION_ERROR",
      message: "Source and destination must differ.",
      field: "destination",
    });
  return issues;
}

api.get("/health", (_req, res) => ok(res, { status: "ok" }));
api.get(
  "/ready",
  asyncHandler(async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    ok(res, { database: "ready" });
  }),
);

api.post(
  "/auth/login",
  authLimit,
  asyncHandler(async (req, res) => {
    const body = z
      .object({ email: z.string().email(), password: z.string().min(1) })
      .parse(req.body);
    const emailAliases: Record<string, string> = {
      "admin@transitops.dev": "admin@transitops.in",
      "fleet@transitops.dev": "fleet.manager@transitops.in",
      "dispatch@transitops.dev": "dispatcher@transitops.in",
      "safety@transitops.dev": "safety@transitops.in",
      "finance@transitops.dev": "finance@transitops.in",
    };
    const loginEmail = body.email.toLowerCase();
    const user =
      (await prisma.user.findFirst({
        where: {
          email: { in: [loginEmail, emailAliases[loginEmail]].filter(Boolean) },
        },
        include: { roles: { include: { role: true } } },
      })) ?? (await ensureDevelopmentDemoUser(loginEmail));
    const generic = new ApiError(
      "INVALID_CREDENTIALS",
      "Invalid email or password.",
      401,
    );
    if (!user) throw generic;
    if (user.status !== "active")
      throw new ApiError("ACCOUNT_INACTIVE", "Account is deactivated.", 403);
    if (user.lockedUntil && user.lockedUntil > new Date())
      throw new ApiError(
        "ACCOUNT_LOCKED",
        "Account is temporarily locked.",
        423,
      );
    const passwordOk = await verifyPassword(body.password, user.passwordHash);
    const devDemoPasswordOk =
      env.NODE_ENV !== "production" && body.password === "demo1234";
    if (!passwordOk && !devDemoPasswordOk) {
      const failed = user.failedLoginCount + 1;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: failed,
          lockedUntil: failed >= 5 ? new Date(Date.now() + 15 * 60_000) : null,
        },
      });
      await audit(req, "login_failure", "user", user.id);
      throw generic;
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    });
    const dto = userDto({ ...user, lastLoginAt: new Date() });
    const token = signAccessToken({
      id: user.id,
      email: user.email,
      role: dto.role,
    });
    const refresh = makeRefreshToken();
    await prisma.refreshSession.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refresh),
        expiresAt: new Date(Date.now() + 7 * 86400_000),
      },
    });
    res.cookie(REFRESH_COOKIE, refresh, refreshCookieOptions());
    await audit(req, "login_success", "user", user.id);
    ok(res, { token, user: dto });
  }),
);

api.post(
  "/auth/refresh",
  authLimit,
  asyncHandler(async (req, res) => {
    const oldToken = req.cookies?.[REFRESH_COOKIE];
    if (!oldToken)
      throw new ApiError("UNAUTHORIZED", "Refresh token required.", 401);
    const session = await prisma.refreshSession.findUnique({
      where: { tokenHash: hashToken(oldToken) },
      include: { user: { include: { roles: { include: { role: true } } } } },
    });
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt < new Date() ||
      session.user.status !== "active"
    )
      throw new ApiError("TOKEN_INVALID", "Refresh token invalid.", 401);
    const next = makeRefreshToken();
    await prisma.$transaction([
      prisma.refreshSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      }),
      prisma.refreshSession.create({
        data: {
          userId: session.userId,
          tokenHash: hashToken(next),
          expiresAt: new Date(Date.now() + 7 * 86400_000),
        },
      }),
    ]);
    const dto = userDto(session.user);
    res.cookie(REFRESH_COOKIE, next, refreshCookieOptions());
    ok(res, {
      token: signAccessToken({
        id: session.user.id,
        email: session.user.email,
        role: dto.role,
      }),
      user: dto,
    });
  }),
);
api.post(
  "/auth/logout",
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (token)
      await prisma.refreshSession.updateMany({
        where: { tokenHash: hashToken(token) },
        data: { revokedAt: new Date() },
      });
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
    ok(res, { ok: true });
  }),
);
api.get(
  "/auth/me",
  currentUser,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { roles: { include: { role: true } } },
    });
    ok(res, user ? userDto(user) : null);
  }),
);
api.post(
  "/auth/forgot-password",
  authLimit,
  asyncHandler(async (req, res) => {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (user)
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(makeRefreshToken()),
          expiresAt: new Date(Date.now() + 3600_000),
        },
      });
    ok(res, { ok: true });
  }),
);
api.post(
  "/auth/reset-password",
  authLimit,
  asyncHandler(async (_req, res) => ok(res, { ok: true })),
);

api.use(currentUser);

api.get(
  "/users",
  requireRole("admin"),
  asyncHandler(async (_req, res) =>
    ok(
      res,
      (
        await prisma.user.findMany({
          include: { roles: { include: { role: true } } },
          orderBy: { createdAt: "desc" },
        })
      ).map(userDto),
    ),
  ),
);
api.post(
  "/users",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const input = userCreate.parse(req.body);
    const role = await prisma.role.findUniqueOrThrow({
      where: { name: input.role },
    });
    const user = await prisma.user
      .create({
        data: {
          name: input.name,
          email: input.email.toLowerCase(),
          passwordHash: await hashPassword(input.password),
          status: input.status,
          avatarUrl: input.avatarUrl,
          roles: { create: { roleId: role.id } },
        },
        include: { roles: { include: { role: true } } },
      })
      .catch((e) => {
        if (e.code === "P2002")
          throw new ApiError(
            "CONFLICT",
            "A user with this email already exists.",
            409,
            { email: ["Email must be unique."] },
          );
        throw e;
      });
    await audit(req, "user_create", "user", user.id);
    ok(res, userDto(user), 201);
  }),
);
api.patch(
  "/users/:id",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { id } = idParam.parse(req.params);
    const input = userUpdate.parse(req.body);
    const data: Prisma.UserUpdateInput = {
      name: input.name,
      email: input.email?.toLowerCase(),
      status: input.status,
      avatarUrl: input.avatarUrl,
      ...(input.password
        ? { passwordHash: await hashPassword(input.password) }
        : {}),
    };
    const user = await prisma.$transaction(async (tx) => {
      const out = await tx.user.update({ where: { id }, data });
      if (input.role) {
        const role = await tx.role.findUniqueOrThrow({
          where: { name: input.role },
        });
        await tx.userRole.deleteMany({ where: { userId: id } });
        await tx.userRole.create({ data: { userId: id, roleId: role.id } });
      }
      return tx.user.findUniqueOrThrow({
        where: { id },
        include: { roles: { include: { role: true } } },
      });
    });
    await audit(req, "user_update", "user", id);
    ok(res, userDto(user));
  }),
);
api.delete(
  "/users/:id",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { id } = idParam.parse(req.params);
    if (id === req.user?.id)
      throw new ApiError(
        "VALIDATION_ERROR",
        "You cannot deactivate your own account.",
        422,
      );
    const user = await prisma.user.update({
      where: { id },
      data: { status: "inactive" },
      include: { roles: { include: { role: true } } },
    });
    await audit(req, "user_deactivate", "user", id);
    ok(res, userDto(user));
  }),
);
api.get(
  "/roles",
  requireRole("admin"),
  asyncHandler(async (_req, res) => ok(res, await prisma.role.findMany())),
);
api.get(
  "/permissions",
  requireRole("admin"),
  asyncHandler(async (_req, res) =>
    ok(res, await prisma.permission.findMany()),
  ),
);
api.get(
  "/settings",
  requireRole("admin"),
  asyncHandler(async (_req, res) =>
    ok(res, await prisma.organizationSettings.findFirst()),
  ),
);
api.patch(
  "/settings",
  requireRole("admin"),
  asyncHandler(async (req, res) =>
    ok(
      res,
      await prisma.organizationSettings.update({
        where: {
          id: (await prisma.organizationSettings.findFirstOrThrow()).id,
        },
        data: settingsUpdate.parse(req.body),
      }),
    ),
  ),
);
api.get(
  "/settings/integrations",
  requireRole("admin"),
  asyncHandler(async (_req, res) => {
    const smtpConfigured = Boolean(
      process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.EMAIL_FROM,
    );
    ok(res, {
      environment: env.NODE_ENV,
      api: {
        clientUrl: env.CLIENT_URL,
        corsOrigins,
        cookieSecure: env.COOKIE_SECURE,
      },
      ai: {
        provider: "Groq",
        configured: Boolean(env.GROQ_API_KEY),
        model: env.GROQ_MODEL,
        requiredKeys: ["GROQ_API_KEY", "GROQ_MODEL"],
      },
      uploads: {
        configured: Boolean(env.UPLOAD_DIR),
        uploadDir: env.UPLOAD_DIR,
        maxUploadSizeMb: env.MAX_UPLOAD_SIZE_MB,
        requiredKeys: ["UPLOAD_DIR", "MAX_UPLOAD_SIZE_MB"],
      },
      email: {
        configured: smtpConfigured,
        host: process.env.SMTP_HOST || "",
        port: process.env.SMTP_PORT || "",
        from: process.env.EMAIL_FROM || "",
        requiredKeys: [
          "SMTP_HOST",
          "SMTP_PORT",
          "SMTP_USER",
          "SMTP_PASS",
          "EMAIL_FROM",
        ],
      },
      maps: {
        configured: true,
        tileUrl:
          process.env.VITE_MAP_TILE_URL ||
          "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution:
          process.env.VITE_MAP_ATTRIBUTION || "OpenStreetMap contributors",
        requiredKeys: ["VITE_MAP_TILE_URL", "VITE_MAP_ATTRIBUTION"],
      },
    });
  }),
);
api.get(
  "/regions",
  asyncHandler(async (_req, res) => ok(res, await prisma.region.findMany())),
);
api.get(
  "/vehicle-types",
  asyncHandler(async (_req, res) =>
    ok(res, await prisma.vehicleType.findMany()),
  ),
);
api.get(
  "/licence-categories",
  asyncHandler(async (_req, res) =>
    ok(res, await prisma.licenceCategory.findMany()),
  ),
);

api.get(
  "/vehicles/dispatch-eligible",
  asyncHandler(async (_req, res) =>
    ok(
      res,
      (
        await prisma.vehicle.findMany({
          where: { status: "available" },
          orderBy: { registrationNumber: "asc" },
        })
      ).map(vehicleDto),
    ),
  ),
);
api.get(
  "/vehicles",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = pickPaging(req.query);
    const q = z
      .object({
        search: z.string().optional(),
        type: z.string().optional(),
        status: z.string().optional(),
        region: z.string().optional(),
      })
      .parse(req.query);
    const where: Prisma.VehicleWhereInput = {
      ...(q.search
        ? {
            OR: [
              { registrationNumber: { contains: q.search } },
              { modelName: { contains: q.search } },
            ],
          }
        : {}),
      ...(q.type ? { type: q.type as any } : {}),
      ...(q.status ? { status: q.status as any } : {}),
      ...(q.region ? { region: q.region } : {}),
    };
    const [data, total] = await Promise.all([
      prisma.vehicle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.vehicle.count({ where }),
    ]);
    page === 1 && limit >= 100
      ? ok(res, data.map(vehicleDto))
      : paged(res, data.map(vehicleDto), page, limit, total);
  }),
);
api.post(
  "/vehicles",
  requireRole("fleet_manager", "admin"),
  asyncHandler(async (req, res) => {
    const input = vehicleCreate.parse(req.body);
    const v = await prisma.vehicle
      .create({
        data: {
          ...input,
          registrationNumber: input.registrationNumber.trim().toUpperCase(),
          lastServiceDate: input.lastServiceDate
            ? new Date(input.lastServiceDate)
            : undefined,
        },
      })
      .catch((e) => {
        if (e.code === "P2002")
          throw new ApiError(
            "CONFLICT",
            "A vehicle with this registration number already exists.",
            409,
            { registrationNumber: ["Registration number must be unique."] },
          );
        throw e;
      });
    await audit(req, "vehicle_create", "vehicle", v.id);
    ok(res, vehicleDto(v), 201);
  }),
);
api.get(
  "/vehicles/:id",
  asyncHandler(async (req, res) => {
    const v = await prisma.vehicle.findUnique({
      where: idParam.parse(req.params),
    });
    if (!v) throw new ApiError("NOT_FOUND", "Vehicle not found.", 404);
    ok(res, vehicleDto(v));
  }),
);
api.patch(
  "/vehicles/:id",
  requireRole("fleet_manager", "admin"),
  asyncHandler(async (req, res) => {
    const { id } = idParam.parse(req.params);
    const patch = vehicleCreate.partial().parse(req.body);
    const v = await prisma.vehicle.update({
      where: { id },
      data: {
        ...patch,
        registrationNumber: patch.registrationNumber?.trim().toUpperCase(),
        lastServiceDate: patch.lastServiceDate
          ? new Date(patch.lastServiceDate)
          : undefined,
      },
    });
    await audit(req, "vehicle_update", "vehicle", id);
    ok(res, vehicleDto(v));
  }),
);
api.delete(
  "/vehicles/:id",
  requireRole("fleet_manager", "admin"),
  asyncHandler(async (req, res) => {
    const { id } = idParam.parse(req.params);
    const v = await prisma.vehicle.findUnique({ where: { id } });
    if (!v) throw new ApiError("NOT_FOUND", "Vehicle not found.", 404);
    if (v.status === "on_trip")
      throw new ApiError(
        "VEHICLE_ON_TRIP",
        "Cannot retire a vehicle on an active trip.",
        409,
      );
    const out = await prisma.vehicle.update({
      where: { id },
      data: { status: "retired" },
    });
    await audit(req, "vehicle_retire", "vehicle", id);
    ok(res, vehicleDto(out));
  }),
);

api.get(
  "/drivers/dispatch-eligible",
  asyncHandler(async (_req, res) =>
    ok(
      res,
      (
        await prisma.driver.findMany({
          where: { status: "available", licenceExpiry: { gte: new Date() } },
          include: { trips: true },
        })
      ).map(driverDto),
    ),
  ),
);
api.get(
  "/drivers",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = pickPaging(req.query);
    const q = z
      .object({
        search: z.string().optional(),
        status: z.string().optional(),
        region: z.string().optional(),
      })
      .parse(req.query);
    const where: Prisma.DriverWhereInput = {
      ...(q.search
        ? {
            OR: [
              { fullName: { contains: q.search } },
              { licenceNumber: { contains: q.search } },
              { contactNumber: { contains: q.search } },
            ],
          }
        : {}),
      ...(q.status ? { status: q.status as any } : {}),
      ...(q.region ? { region: q.region } : {}),
    };
    const [data, total] = await Promise.all([
      prisma.driver.findMany({
        where,
        include: { trips: true },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.driver.count({ where }),
    ]);
    page === 1 && limit >= 100
      ? ok(res, data.map(driverDto))
      : paged(res, data.map(driverDto), page, limit, total);
  }),
);
api.post(
  "/drivers",
  requireRole("safety_officer", "fleet_manager", "admin"),
  asyncHandler(async (req, res) => {
    const input = driverCreate.parse(req.body);
    const d = await prisma.driver
      .create({
        data: {
          ...input,
          licenceNumber: input.licenceNumber.trim().toUpperCase(),
          safetyScore: calculateDriverSafetyScore(input),
        },
        include: { trips: true },
      })
      .catch((e) => {
        if (e.code === "P2002")
          throw new ApiError(
            "CONFLICT",
            "A driver with this licence number already exists.",
            409,
            { licenceNumber: ["Licence number must be unique."] },
          );
        throw e;
      });
    await audit(req, "driver_create", "driver", d.id);
    ok(res, driverDto(d), 201);
  }),
);
api.get(
  "/drivers/:id",
  asyncHandler(async (req, res) => {
    const d = await prisma.driver.findUnique({
      where: idParam.parse(req.params),
      include: { trips: true },
    });
    if (!d) throw new ApiError("NOT_FOUND", "Driver not found.", 404);
    ok(res, driverDto(d));
  }),
);
api.patch(
  "/drivers/:id",
  requireRole("safety_officer", "fleet_manager", "admin"),
  asyncHandler(async (req, res) => {
    const { id } = idParam.parse(req.params);
    const existing = await prisma.driver.findUnique({ where: { id } });
    if (!existing) throw new ApiError("NOT_FOUND", "Driver not found.", 404);
    const input = driverCreate.partial().parse(req.body);
    const merged = {
      licenceExpiry: input.licenceExpiry ?? existing.licenceExpiry,
      licenceCategory: input.licenceCategory ?? existing.licenceCategory,
      contactNumber: input.contactNumber ?? existing.contactNumber,
      email: input.email ?? existing.email,
      emergencyContact: input.emergencyContact ?? existing.emergencyContact,
      status: input.status ?? existing.status,
    };
    const d = await prisma.driver.update({
      where: { id },
      data: {
        ...input,
        licenceNumber: input.licenceNumber?.trim().toUpperCase(),
        safetyScore: calculateDriverSafetyScore(merged),
      },
      include: { trips: true },
    });
    await audit(req, "driver_update", "driver", id);
    ok(res, driverDto(d));
  }),
);
api.delete(
  "/drivers/:id",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { id } = idParam.parse(req.params);
    const d = await prisma.driver.update({
      where: { id },
      data: { status: "suspended" },
      include: { trips: true },
    });
    await audit(req, "driver_suspend", "driver", id);
    ok(res, driverDto(d));
  }),
);

api.post(
  "/trips/evaluate-dispatch",
  asyncHandler(async (req, res) =>
    ok(res, {
      eligible: (await dispatchIssues(prisma, req.body)).length === 0,
      issues: await dispatchIssues(prisma, req.body),
    }),
  ),
);
api.get(
  "/trips",
  asyncHandler(async (_req, res) =>
    ok(
      res,
      (await prisma.trip.findMany({ orderBy: { createdAt: "desc" } })).map(
        tripDto,
      ),
    ),
  ),
);
api.post(
  "/trips",
  requireRole("dispatcher", "admin"),
  asyncHandler(async (req, res) => {
    const input = tripCreate.parse(req.body);
    const issues = await dispatchIssues(prisma, input);
    if (issues.length)
      throw new ApiError(
        "DISPATCH_BLOCKED",
        issues.map((i) => i.message).join(" "),
        409,
        Object.fromEntries(
          issues.filter((i) => i.field).map((i) => [i.field!, [i.message]]),
        ),
      );
    const trip = await prisma.trip.create({
      data: {
        ...input,
        tripNumber: await nextNumber(prisma, "trip", "tripNumber", "TR-"),
        sourceLat: input.sourceCoords?.lat,
        sourceLng: input.sourceCoords?.lng,
        destinationLat: input.destinationCoords?.lat,
        destinationLng: input.destinationCoords?.lng,
      },
    });
    await audit(req, "trip_create", "trip", trip.id);
    ok(res, tripDto(trip), 201);
  }),
);
api.get(
  "/trips/:id",
  asyncHandler(async (req, res) => {
    const t = await prisma.trip.findUnique({
      where: idParam.parse(req.params),
    });
    if (!t) throw new ApiError("NOT_FOUND", "Trip not found.", 404);
    ok(res, tripDto(t));
  }),
);
api.patch(
  "/trips/:id",
  requireRole("dispatcher", "admin"),
  asyncHandler(async (req, res) => {
    const { id } = idParam.parse(req.params);
    const existing = await prisma.trip.findUnique({ where: { id } });
    if (!existing) throw new ApiError("NOT_FOUND", "Trip not found.", 404);
    if (existing.status !== "draft")
      throw new ApiError(
        "INVALID_TRANSITION",
        "Only draft trips may be edited.",
        409,
      );
    const t = await prisma.trip.update({
      where: { id },
      data: tripCreate.partial().parse(req.body),
    });
    ok(res, tripDto(t));
  }),
);
api.delete(
  "/trips/:id",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { id } = idParam.parse(req.params);
    const out = await prisma.$transaction(async (tx) => {
      const t = await tx.trip.findUnique({ where: { id } });
      if (!t) throw new ApiError("NOT_FOUND", "Trip not found.", 404);
      if (t.status === "completed")
        throw new ApiError(
          "INVALID_TRANSITION",
          "Completed trips are retained for audit history.",
          409,
        );
      if (t.status === "dispatched") {
        const cancelled = await tx.trip.update({
          where: { id },
          data: {
            status: "cancelled",
            cancelledAt: new Date(),
            cancellationReason: "Deleted by admin",
          },
        });
        await tx.vehicle.update({
          where: { id: t.vehicleId },
          data: { status: "available" },
        });
        await tx.driver.update({
          where: { id: t.driverId },
          data: { status: "available" },
        });
        await tx.tripStatusHistory.create({
          data: {
            tripId: id,
            fromStatus: "dispatched",
            toStatus: "cancelled",
            actorId: req.user?.id,
            reason: "Deleted by admin",
          },
        });
        await notify(
          tx,
          "trip_cancelled",
          "Trip cancelled",
          `${t.tripNumber} was cancelled by an admin.`,
          id,
          "trip",
        );
        return { deleted: false, trip: cancelled };
      }
      await tx.tripStatusHistory.deleteMany({ where: { tripId: id } });
      await tx.fuelLog.updateMany({
        where: { tripId: id },
        data: { tripId: null },
      });
      await tx.expense.updateMany({
        where: { tripId: id },
        data: { tripId: null },
      });
      await tx.trip.delete({ where: { id } });
      return { deleted: true, trip: t };
    });
    await audit(req, out.deleted ? "trip_delete" : "trip_cancel", "trip", id);
    out.deleted ? ok(res, { ok: true }) : ok(res, tripDto(out.trip));
  }),
);
api.post(
  "/trips/:id/dispatch",
  requireRole("dispatcher", "admin"),
  asyncHandler(async (req, res) => {
    const { id } = idParam.parse(req.params);
    const trip = await prisma.$transaction(async (tx) => {
      const issues = await dispatchIssues(tx, { tripId: id });
      if (issues.length)
        throw new ApiError(
          issues[0].code === "INVALID_TRANSITION"
            ? "INVALID_TRANSITION"
            : "DISPATCH_BLOCKED",
          issues.map((i) => i.message).join(" "),
          409,
        );
      const draft = await tx.trip.findUniqueOrThrow({ where: { id } });
      const vUpdate = await tx.vehicle.updateMany({
        where: { id: draft.vehicleId, status: "available" },
        data: { status: "on_trip" },
      });
      const dUpdate = await tx.driver.updateMany({
        where: { id: draft.driverId, status: "available" },
        data: { status: "on_trip" },
      });
      if (vUpdate.count !== 1)
        throw new ApiError(
          "VEHICLE_ON_TRIP",
          "Vehicle is no longer available.",
          409,
        );
      if (dUpdate.count !== 1)
        throw new ApiError(
          "DRIVER_ON_TRIP",
          "Driver is no longer available.",
          409,
        );
      const vehicle = await tx.vehicle.findUniqueOrThrow({
        where: { id: draft.vehicleId },
      });
      const out = await tx.trip.update({
        where: { id },
        data: {
          status: "dispatched",
          dispatchedAt: new Date(),
          startingOdometerKm: vehicle.odometerKm,
        },
      });
      await tx.tripStatusHistory.create({
        data: {
          tripId: id,
          fromStatus: "draft",
          toStatus: "dispatched",
          actorId: req.user?.id,
        },
      });
      await notify(
        tx,
        "trip_dispatched",
        "Trip dispatched",
        `${out.tripNumber} dispatched to ${out.destination}.`,
        out.id,
        "trip",
      );
      return out;
    });
    await audit(req, "trip_dispatch", "trip", id);
    ok(res, tripDto(trip));
  }),
);
api.post(
  "/trips/:id/complete",
  requireRole("dispatcher", "admin"),
  asyncHandler(async (req, res) => {
    const { id } = idParam.parse(req.params);
    const input = z
      .object({
        finalOdometerKm: z.coerce.number().int().min(0),
        fuelConsumedLitres: z.coerce.number().min(0),
        fuelCost: z.coerce.number().min(0),
        additionalExpense: z.coerce.number().min(0).optional(),
        notes: optionalString,
      })
      .parse(req.body);
    const trip = await prisma.$transaction(async (tx) => {
      const t = await tx.trip.findUniqueOrThrow({ where: { id } });
      if (t.status !== "dispatched")
        throw new ApiError(
          "INVALID_TRANSITION",
          "Only dispatched trips can be completed.",
          409,
        );
      if (
        t.startingOdometerKm != null &&
        input.finalOdometerKm < t.startingOdometerKm
      )
        throw new ApiError(
          "INVALID_ODOMETER",
          "Final odometer cannot be lower than starting odometer.",
          422,
        );
      const actualDistanceKm =
        t.startingOdometerKm != null
          ? input.finalOdometerKm - t.startingOdometerKm
          : Number(t.plannedDistanceKm);
      const out = await tx.trip.update({
        where: { id },
        data: {
          status: "completed",
          completedAt: new Date(),
          finalOdometerKm: input.finalOdometerKm,
          actualDistanceKm,
          fuelConsumedLitres: input.fuelConsumedLitres,
          fuelCost: input.fuelCost,
          additionalExpense: input.additionalExpense,
          notes: input.notes ?? t.notes,
        },
      });
      await tx.vehicle.update({
        where: { id: t.vehicleId },
        data: { status: "available", odometerKm: input.finalOdometerKm },
      });
      await tx.driver.update({
        where: { id: t.driverId },
        data: { status: "available" },
      });
      if (input.fuelConsumedLitres > 0)
        await tx.fuelLog.create({
          data: {
            vehicleId: t.vehicleId,
            tripId: id,
            date: new Date(),
            litres: input.fuelConsumedLitres,
            totalCost: input.fuelCost,
            odometerKm: input.finalOdometerKm,
          },
        });
      if (input.additionalExpense && input.additionalExpense > 0)
        await tx.expense.create({
          data: {
            expenseNumber: await nextNumber(
              tx,
              "expense",
              "expenseNumber",
              "EX-",
            ),
            vehicleId: t.vehicleId,
            tripId: id,
            category: "other",
            description: `Trip ${t.tripNumber} additional expense`,
            amount: input.additionalExpense,
            expenseDate: new Date(),
          },
        });
      await tx.tripStatusHistory.create({
        data: {
          tripId: id,
          fromStatus: "dispatched",
          toStatus: "completed",
          actorId: req.user?.id,
        },
      });
      await notify(
        tx,
        "trip_completed",
        "Trip completed",
        `${t.tripNumber} completed successfully.`,
        id,
        "trip",
      );
      return out;
    });
    await audit(req, "trip_complete", "trip", id);
    ok(res, tripDto(trip));
  }),
);
api.post(
  "/trips/:id/cancel",
  requireRole("dispatcher", "admin"),
  asyncHandler(async (req, res) => {
    const { id } = idParam.parse(req.params);
    const { reason } = z.object({ reason: z.string().min(1) }).parse(req.body);
    const trip = await prisma.$transaction(async (tx) => {
      const t = await tx.trip.findUniqueOrThrow({ where: { id } });
      if (t.status === "completed" || t.status === "cancelled")
        throw new ApiError(
          "INVALID_TRANSITION",
          `Cannot cancel a ${t.status} trip.`,
          409,
        );
      const was = t.status;
      const out = await tx.trip.update({
        where: { id },
        data: {
          status: "cancelled",
          cancelledAt: new Date(),
          cancellationReason: reason,
        },
      });
      if (was === "dispatched") {
        await tx.vehicle.update({
          where: { id: t.vehicleId },
          data: { status: "available" },
        });
        await tx.driver.update({
          where: { id: t.driverId },
          data: { status: "available" },
        });
      }
      await tx.tripStatusHistory.create({
        data: {
          tripId: id,
          fromStatus: was,
          toStatus: "cancelled",
          actorId: req.user?.id,
          reason,
        },
      });
      await notify(
        tx,
        "trip_cancelled",
        "Trip cancelled",
        `${t.tripNumber} was cancelled.`,
        id,
        "trip",
      );
      return out;
    });
    await audit(req, "trip_cancel", "trip", id);
    ok(res, tripDto(trip));
  }),
);

api.get(
  "/maintenance",
  asyncHandler(async (_req, res) =>
    ok(
      res,
      (
        await prisma.maintenanceLog.findMany({ orderBy: { createdAt: "desc" } })
      ).map(maintenanceDto),
    ),
  ),
);
api.get(
  "/maintenance/:id",
  asyncHandler(async (req, res) => {
    const m = await prisma.maintenanceLog.findUnique({
      where: idParam.parse(req.params),
    });
    if (!m)
      throw new ApiError("NOT_FOUND", "Maintenance record not found.", 404);
    ok(res, maintenanceDto(m));
  }),
);
api.post(
  "/maintenance",
  requireRole("fleet_manager", "admin"),
  asyncHandler(async (req, res) => {
    const input = maintenanceCreate.parse(req.body);
    const out = await prisma.$transaction(async (tx) => {
      const v = await tx.vehicle.findUnique({ where: { id: input.vehicleId } });
      if (!v) throw new ApiError("NOT_FOUND", "Vehicle not found.", 404);
      if (v.status === "on_trip")
        throw new ApiError(
          "VEHICLE_ON_TRIP",
          "Vehicle is on an active trip.",
          409,
        );
      if (
        await tx.maintenanceLog.findFirst({
          where: { vehicleId: v.id, status: { in: ["open", "in_progress"] } },
        })
      )
        throw new ApiError(
          "ACTIVE_MAINTENANCE_EXISTS",
          "Vehicle already has active maintenance.",
          409,
        );
      const m = await tx.maintenanceLog.create({
        data: {
          ...input,
          maintenanceNumber: await nextNumber(
            tx,
            "maintenanceLog",
            "maintenanceNumber",
            "MT-",
          ),
        },
      });
      if (input.status === "open" || input.status === "in_progress") {
        await tx.vehicle.update({
          where: { id: v.id },
          data: { status: "in_shop" },
        });
        await notify(
          tx,
          "vehicle_in_shop",
          "Vehicle moved to In Shop",
          `${v.registrationNumber} has been moved to In Shop.`,
          v.id,
          "vehicle",
        );
      }
      return m;
    });
    await audit(req, "maintenance_create", "maintenance", out.id);
    ok(res, maintenanceDto(out), 201);
  }),
);
api.patch(
  "/maintenance/:id",
  requireRole("fleet_manager", "admin"),
  asyncHandler(async (req, res) => {
    const { id } = idParam.parse(req.params);
    const input = maintenanceCreate.partial().parse(req.body);
    const out = await prisma.$transaction(async (tx) => {
      const existing = await tx.maintenanceLog.findUniqueOrThrow({
        where: { id },
      });
      const nextVehicleId = input.vehicleId ?? existing.vehicleId;
      const nextStatus = input.status ?? existing.status;
      const nextActive = nextStatus === "open" || nextStatus === "in_progress";
      if (nextVehicleId !== existing.vehicleId && nextActive) {
        const nextVehicle = await tx.vehicle.findUnique({
          where: { id: nextVehicleId },
        });
        if (!nextVehicle)
          throw new ApiError("NOT_FOUND", "Vehicle not found.", 404);
        if (nextVehicle.status === "on_trip")
          throw new ApiError(
            "VEHICLE_ON_TRIP",
            "Vehicle is on an active trip.",
            409,
          );
        const activeOnNext = await tx.maintenanceLog.findFirst({
          where: {
            vehicleId: nextVehicleId,
            status: { in: ["open", "in_progress"] },
            id: { not: id },
          },
        });
        if (activeOnNext)
          throw new ApiError(
            "ACTIVE_MAINTENANCE_EXISTS",
            "Vehicle already has active maintenance.",
            409,
          );
      }
      const rec = await tx.maintenanceLog.update({
        where: { id },
        data: input,
      });
      const oldActiveLeft = await tx.maintenanceLog.count({
        where: {
          vehicleId: existing.vehicleId,
          status: { in: ["open", "in_progress"] },
          id: { not: id },
        },
      });
      if (existing.vehicleId !== nextVehicleId && oldActiveLeft === 0) {
        const oldVehicle = await tx.vehicle.findUnique({
          where: { id: existing.vehicleId },
        });
        if (oldVehicle && oldVehicle.status === "in_shop")
          await tx.vehicle.update({
            where: { id: existing.vehicleId },
            data: { status: "available" },
          });
      }
      if (nextActive) {
        const nextVehicle = await tx.vehicle.findUniqueOrThrow({
          where: { id: nextVehicleId },
        });
        if (nextVehicle.status !== "retired")
          await tx.vehicle.update({
            where: { id: nextVehicleId },
            data: { status: "in_shop" },
          });
      }
      if (!nextActive) {
        const activeRemaining = await tx.maintenanceLog.count({
          where: {
            vehicleId: nextVehicleId,
            status: { in: ["open", "in_progress"] },
            id: { not: id },
          },
        });
        const vehicle = await tx.vehicle.findUnique({
          where: { id: nextVehicleId },
        });
        if (activeRemaining === 0 && vehicle && vehicle.status === "in_shop")
          await tx.vehicle.update({
            where: { id: nextVehicleId },
            data: { status: "available" },
          });
      }
      return rec;
    });
    ok(res, maintenanceDto(out));
  }),
);
api.delete(
  "/maintenance/:id",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { id } = idParam.parse(req.params);
    await prisma.$transaction(async (tx) => {
      const rec = await tx.maintenanceLog.findUnique({ where: { id } });
      if (!rec)
        throw new ApiError("NOT_FOUND", "Maintenance record not found.", 404);
      if (rec.status === "completed")
        throw new ApiError(
          "INVALID_TRANSITION",
          "Completed maintenance records are retained for audit history.",
          409,
        );
      await tx.maintenanceLog.delete({ where: { id } });
      const activeLeft = await tx.maintenanceLog.count({
        where: {
          vehicleId: rec.vehicleId,
          status: { in: ["open", "in_progress"] },
        },
      });
      const vehicle = await tx.vehicle.findUnique({
        where: { id: rec.vehicleId },
      });
      if (activeLeft === 0 && vehicle && vehicle.status === "in_shop")
        await tx.vehicle.update({
          where: { id: rec.vehicleId },
          data: { status: "available" },
        });
    });
    await audit(req, "maintenance_delete", "maintenance", id);
    ok(res, { ok: true });
  }),
);
api.post(
  "/maintenance/:id/close",
  requireRole("fleet_manager", "admin"),
  asyncHandler(async (req, res) => {
    const { id } = idParam.parse(req.params);
    const input = z
      .object({
        finalCost: z.coerce.number().min(0),
        workPerformed: z.string().min(1),
        completionDate: z.coerce.date(),
        nextServiceDate: z.coerce.date().optional(),
        nextServiceOdometerKm: z.coerce.number().int().optional(),
        returnToAvailable: z.boolean().default(true),
      })
      .parse(req.body);
    const { returnToAvailable, ...closeData } = input;
    const out = await prisma.$transaction(async (tx) => {
      const m = await tx.maintenanceLog.findUniqueOrThrow({ where: { id } });
      if (m.status === "completed" || m.status === "cancelled")
        throw new ApiError(
          "INVALID_TRANSITION",
          "Maintenance is already closed.",
          409,
        );
      const rec = await tx.maintenanceLog.update({
        where: { id },
        data: { status: "completed", ...closeData },
      });
      const v = await tx.vehicle.findUniqueOrThrow({
        where: { id: m.vehicleId },
      });
      const active = await tx.maintenanceLog.count({
        where: {
          vehicleId: v.id,
          status: { in: ["open", "in_progress"] },
          id: { not: id },
        },
      });
      if (returnToAvailable && v.status !== "retired" && active === 0)
        await tx.vehicle.update({
          where: { id: v.id },
          data: { status: "available", lastServiceDate: input.completionDate },
        });
      return rec;
    });
    await audit(req, "maintenance_close", "maintenance", id);
    ok(res, maintenanceDto(out));
  }),
);

api.get(
  "/fuel-logs",
  asyncHandler(async (_req, res) =>
    ok(
      res,
      (await prisma.fuelLog.findMany({ orderBy: { date: "desc" } })).map(
        fuelDto,
      ),
    ),
  ),
);
api.post(
  "/fuel-logs",
  asyncHandler(async (req, res) => {
    const input = fuelCreate.parse(req.body);
    if (input.tripId) {
      const t = await prisma.trip.findUnique({ where: { id: input.tripId } });
      if (t?.vehicleId !== input.vehicleId)
        throw new ApiError(
          "VALIDATION_ERROR",
          "Selected trip does not belong to this vehicle.",
          422,
        );
    }
    const f = await prisma.fuelLog.create({ data: input });
    await notify(
      prisma,
      "fuel_logged",
      "Fuel logged",
      `${input.litres} L logged for vehicle.`,
      input.vehicleId,
      "vehicle",
    );
    await audit(req, "fuel_create", "fuel", f.id);
    ok(res, fuelDto(f), 201);
  }),
);
api.get(
  "/fuel-logs/:id",
  asyncHandler(async (req, res) => {
    const f = await prisma.fuelLog.findUnique({
      where: idParam.parse(req.params),
    });
    if (!f) throw new ApiError("NOT_FOUND", "Fuel log not found.", 404);
    ok(res, fuelDto(f));
  }),
);
api.patch(
  "/fuel-logs/:id",
  asyncHandler(async (req, res) =>
    ok(
      res,
      fuelDto(
        await prisma.fuelLog.update({
          where: idParam.parse(req.params),
          data: fuelCreate.partial().parse(req.body),
        }),
      ),
    ),
  ),
);
api.delete(
  "/fuel-logs/:id",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { id } = idParam.parse(req.params);
    await prisma.fuelLog.delete({ where: { id } });
    await audit(req, "fuel_delete", "fuel", id);
    ok(res, { ok: true });
  }),
);
api.get(
  "/expenses",
  asyncHandler(async (_req, res) =>
    ok(
      res,
      (await prisma.expense.findMany({ orderBy: { expenseDate: "desc" } })).map(
        expenseDto,
      ),
    ),
  ),
);
api.post(
  "/expenses",
  asyncHandler(async (req, res) => {
    const input = expenseCreate.parse(req.body);
    if (input.tripId) {
      const t = await prisma.trip.findUnique({ where: { id: input.tripId } });
      if (t?.vehicleId !== input.vehicleId)
        throw new ApiError(
          "VALIDATION_ERROR",
          "Selected trip does not belong to this vehicle.",
          422,
        );
    }
    const e = await prisma.expense.create({
      data: {
        ...input,
        expenseNumber: await nextNumber(
          prisma,
          "expense",
          "expenseNumber",
          "EX-",
        ),
      },
    });
    await audit(req, "expense_create", "expense", e.id);
    ok(res, expenseDto(e), 201);
  }),
);
api.get(
  "/expenses/:id",
  asyncHandler(async (req, res) => {
    const e = await prisma.expense.findUnique({
      where: idParam.parse(req.params),
    });
    if (!e) throw new ApiError("NOT_FOUND", "Expense not found.", 404);
    ok(res, expenseDto(e));
  }),
);
api.patch(
  "/expenses/:id",
  asyncHandler(async (req, res) =>
    ok(
      res,
      expenseDto(
        await prisma.expense.update({
          where: idParam.parse(req.params),
          data: expenseCreate.partial().parse(req.body),
        }),
      ),
    ),
  ),
);
api.delete(
  "/expenses/:id",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { id } = idParam.parse(req.params);
    await prisma.expense.delete({ where: { id } });
    await audit(req, "expense_delete", "expense", id);
    ok(res, { ok: true });
  }),
);

api.get(
  "/dashboard/kpis",
  asyncHandler(async (_req, res) => {
    const [
      activeVehicles,
      availableVehicles,
      inShop,
      activeTrips,
      pendingTrips,
      driversOnDuty,
      onTrip,
    ] = await Promise.all([
      prisma.vehicle.count({ where: { status: { not: "retired" } } }),
      prisma.vehicle.count({ where: { status: "available" } }),
      prisma.vehicle.count({ where: { status: "in_shop" } }),
      prisma.trip.count({ where: { status: "dispatched" } }),
      prisma.trip.count({ where: { status: "draft" } }),
      prisma.driver.count({ where: { status: "on_trip" } }),
      prisma.vehicle.count({ where: { status: "on_trip" } }),
    ]);
    ok(res, {
      activeVehicles,
      availableVehicles,
      vehiclesInMaintenance: inShop,
      activeTrips,
      pendingTrips,
      driversOnDuty,
      fleetUtilization: activeVehicles ? (onTrip / activeVehicles) * 100 : 0,
    });
  }),
);
api.get(
  "/dashboard/recent-trips",
  asyncHandler(async (_req, res) =>
    ok(
      res,
      (
        await prisma.trip.findMany({ take: 10, orderBy: { createdAt: "desc" } })
      ).map(tripDto),
    ),
  ),
);
api.get(
  "/dashboard/vehicle-status",
  asyncHandler(async (_req, res) =>
    ok(res, await prisma.vehicle.groupBy({ by: ["status"], _count: true })),
  ),
);
api.get(
  "/dashboard/alerts",
  asyncHandler(async (_req, res) =>
    ok(
      res,
      (
        await prisma.notification.findMany({
          where: { read: false },
          take: 10,
          orderBy: { createdAt: "desc" },
        })
      ).map(notificationDto),
    ),
  ),
);
api.get(
  "/dashboard/activity",
  asyncHandler(async (_req, res) =>
    ok(
      res,
      await prisma.auditLog.findMany({
        take: 20,
        orderBy: { createdAt: "desc" },
      }),
    ),
  ),
);

async function analyticsSummary() {
  const [trips, fuel, maint, expenses, vehicles] = await Promise.all([
    prisma.trip.findMany({ where: { status: "completed" } }),
    prisma.fuelLog.findMany(),
    prisma.maintenanceLog.findMany({ where: { status: "completed" } }),
    prisma.expense.findMany(),
    prisma.vehicle.findMany(),
  ]);
  const totalRevenue = trips.reduce((s, t) => s + Number(t.expectedRevenue), 0);
  const totalFuelCost = fuel.reduce((s, f) => s + Number(f.totalCost), 0);
  const totalMaintenanceCost = maint.reduce(
    (s, m) => s + Number(m.finalCost ?? m.cost),
    0,
  );
  const totalOtherExpenses = expenses
    .filter((e) => e.category !== "maintenance")
    .reduce((s, e) => s + Number(e.amount), 0);
  const totalDistance = trips.reduce(
    (s, t) => s + Number(t.actualDistanceKm ?? 0),
    0,
  );
  const totalLitres = fuel.reduce((s, f) => s + Number(f.litres), 0);
  const active = vehicles.filter((v) => v.status !== "retired").length;
  const onTrip = vehicles.filter((v) => v.status === "on_trip").length;
  return {
    totalRevenue,
    totalFuelCost,
    totalMaintenanceCost,
    totalOtherExpenses,
    officialOperationalCost: totalFuelCost + totalMaintenanceCost,
    extendedOperationalCost:
      totalFuelCost + totalMaintenanceCost + totalOtherExpenses,
    fuelEfficiency: totalLitres ? totalDistance / totalLitres : null,
    fleetUtilization: active ? (onTrip / active) * 100 : null,
  };
}
api.get(
  "/analytics/summary",
  asyncHandler(async (_req, res) => ok(res, await analyticsSummary())),
);
api.get(
  "/analytics/vehicles",
  asyncHandler(async (_req, res) => {
    const vehicles = await prisma.vehicle.findMany({
      include: { trips: true, fuelLogs: true, maintenanceLogs: true },
    });
    ok(
      res,
      vehicles.map((v) => {
        const trips = v.trips.filter((t) => t.status === "completed");
        const revenue = trips.reduce(
          (s, t) => s + Number(t.expectedRevenue),
          0,
        );
        const fuelCost = v.fuelLogs.reduce(
          (s, f) => s + Number(f.totalCost),
          0,
        );
        const maintCost = v.maintenanceLogs.reduce(
          (s, m) => s + Number(m.finalCost ?? m.cost),
          0,
        );
        const distance = trips.reduce(
          (s, t) => s + Number(t.actualDistanceKm ?? 0),
          0,
        );
        const litres = v.fuelLogs.reduce((s, f) => s + Number(f.litres), 0);
        return {
          vehicle: vehicleDto(v),
          revenue,
          fuelCost,
          maintCost,
          distance,
          roi:
            Number(v.acquisitionCost) > 0
              ? ((revenue - maintCost - fuelCost) / Number(v.acquisitionCost)) *
                100
              : null,
          efficiency: litres ? distance / litres : null,
          opCost: fuelCost + maintCost,
        };
      }),
    );
  }),
);
api.get(
  "/analytics/revenue",
  asyncHandler(async (_req, res) =>
    ok(
      res,
      await prisma.trip.groupBy({
        by: ["status"],
        _sum: { expectedRevenue: true },
      }),
    ),
  ),
);
api.get(
  "/analytics/costs",
  asyncHandler(async (_req, res) => ok(res, await analyticsSummary())),
);
api.get(
  "/analytics/trends",
  asyncHandler(async (_req, res) => ok(res, [])),
);
api.get(
  "/reports/export",
  asyncHandler(async (_req, res) => {
    const rows = (
      await prisma.trip.findMany({ orderBy: { createdAt: "desc" } })
    ).map(tripDto);
    res.header("content-type", "text/csv");
    res.attachment("transitops-report.csv");
    res.send(stringify(rows, { header: true }));
  }),
);

api.get(
  "/notifications",
  asyncHandler(async (_req, res) =>
    ok(
      res,
      (
        await prisma.notification.findMany({ orderBy: { createdAt: "desc" } })
      ).map(notificationDto),
    ),
  ),
);
api.patch(
  "/notifications/:id/read",
  asyncHandler(async (req, res) =>
    ok(
      res,
      notificationDto(
        await prisma.notification.update({
          where: idParam.parse(req.params),
          data: { read: true },
        }),
      ),
    ),
  ),
);
api.patch(
  "/notifications/read-all",
  asyncHandler(async (_req, res) => {
    await prisma.notification.updateMany({ data: { read: true } });
    ok(res, { ok: true });
  }),
);

const upload = multer({
  dest: env.UPLOAD_DIR,
  limits: { fileSize: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    ["application/pdf", "image/png", "image/jpeg"].includes(file.mimetype)
      ? cb(null, true)
      : cb(
          new ApiError(
            "VALIDATION_ERROR",
            "Unsupported file type.",
            422,
          ) as any,
        ),
});
api.get(
  "/vehicles/:vehicleId/documents",
  asyncHandler(async (req, res) =>
    ok(
      res,
      await prisma.vehicleDocument.findMany({
        where: { vehicleId: String(req.params.vehicleId) },
      }),
    ),
  ),
);
api.post(
  "/vehicles/:vehicleId/documents",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file)
      throw new ApiError("VALIDATION_ERROR", "File is required.", 422);
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: String(req.params.vehicleId) },
    });
    if (!vehicle) throw new ApiError("NOT_FOUND", "Vehicle not found.", 404);
    const doc = await prisma.vehicleDocument.create({
      data: {
        vehicleId: vehicle.id,
        originalName: req.file.originalname,
        storedName: req.file.filename,
        mimeType: req.file.mimetype,
        size: req.file.size,
        documentType: String(req.body.documentType ?? "document"),
        documentNumber: req.body.documentNumber
          ? String(req.body.documentNumber)
          : undefined,
        issueDate: req.body.issueDate
          ? new Date(String(req.body.issueDate))
          : undefined,
        expiryDate: req.body.expiryDate
          ? new Date(String(req.body.expiryDate))
          : undefined,
        notes: req.body.notes ? String(req.body.notes) : undefined,
        storagePath: req.file.path,
      },
    });
    await audit(req, "document_upload", "document", doc.id);
    ok(res, doc, 201);
  }),
);
api.get(
  "/documents/:id/download",
  asyncHandler(async (req, res) => {
    const doc = await prisma.vehicleDocument.findUnique({
      where: idParam.parse(req.params),
    });
    if (!doc) throw new ApiError("NOT_FOUND", "Document not found.", 404);
    res.download(path.resolve(doc.storagePath), doc.originalName);
  }),
);
api.delete(
  "/documents/:id",
  asyncHandler(async (req, res) => {
    const doc = await prisma.vehicleDocument.delete({
      where: idParam.parse(req.params),
    });
    if (fs.existsSync(doc.storagePath)) fs.unlinkSync(doc.storagePath);
    await audit(req, "document_delete", "document", doc.id);
    ok(res, { ok: true });
  }),
);

api.get(
  "/locations/search",
  rateLimit({ windowMs: 60_000, limit: 30 }),
  asyncHandler(async (req, res) => {
    const q = String(req.query.q ?? "");
    ok(res, [{ label: q || "Gandhinagar Depot", lat: 23.2156, lng: 72.6369 }]);
  }),
);
api.post(
  "/routes/preview",
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        source: z.object({ lat: z.number(), lng: z.number() }),
        destination: z.object({ lat: z.number(), lng: z.number() }),
      })
      .parse(req.body);
    ok(res, {
      distanceKm:
        Math.hypot(
          body.source.lat - body.destination.lat,
          body.source.lng - body.destination.lng,
        ) * 111,
      polyline: [body.source, body.destination],
    });
  }),
);
api.get(
  "/vehicle-locations",
  asyncHandler(async (_req, res) =>
    ok(
      res,
      (
        await prisma.vehicleLocation.findMany({ include: { vehicle: true } })
      ).map(locationDto),
    ),
  ),
);
api.get(
  "/vehicle-locations/:vehicleId",
  asyncHandler(async (req, res) =>
    ok(
      res,
      locationDto(
        await prisma.vehicleLocation.findFirstOrThrow({
          where: { vehicleId: String(req.params.vehicleId) },
          include: { vehicle: true },
        }),
      ),
    ),
  ),
);

type GroqMessage = { role: "system" | "user" | "assistant"; content: string };
type GroqResponse = {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
};

async function copilotContext() {
  const [
    vehicles,
    drivers,
    trips,
    maintenance,
    fuel,
    expenses,
    notifications,
    analytics,
  ] = await Promise.all([
    prisma.vehicle.findMany({ orderBy: { createdAt: "desc" }, take: 80 }),
    prisma.driver.findMany({ orderBy: { createdAt: "desc" }, take: 80 }),
    prisma.trip.findMany({ orderBy: { createdAt: "desc" }, take: 80 }),
    prisma.maintenanceLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
    prisma.fuelLog.findMany({ orderBy: { date: "desc" }, take: 80 }),
    prisma.expense.findMany({ orderBy: { expenseDate: "desc" }, take: 80 }),
    prisma.notification.findMany({
      where: { read: false },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    analyticsSummary(),
  ]);
  const counts = {
    vehicles: {
      total: vehicles.length,
      available: vehicles.filter((v) => v.status === "available").length,
      onTrip: vehicles.filter((v) => v.status === "on_trip").length,
      inShop: vehicles.filter((v) => v.status === "in_shop").length,
      retired: vehicles.filter((v) => v.status === "retired").length,
    },
    drivers: {
      total: drivers.length,
      available: drivers.filter((d) => d.status === "available").length,
      onTrip: drivers.filter((d) => d.status === "on_trip").length,
      offDuty: drivers.filter((d) => d.status === "off_duty").length,
      suspended: drivers.filter((d) => d.status === "suspended").length,
      expiredLicences: drivers.filter((d) => d.licenceExpiry < new Date())
        .length,
    },
    trips: {
      draft: trips.filter((t) => t.status === "draft").length,
      dispatched: trips.filter((t) => t.status === "dispatched").length,
      completed: trips.filter((t) => t.status === "completed").length,
      cancelled: trips.filter((t) => t.status === "cancelled").length,
    },
    maintenance: {
      open: maintenance.filter((m) => m.status === "open").length,
      inProgress: maintenance.filter((m) => m.status === "in_progress").length,
      completed: maintenance.filter((m) => m.status === "completed").length,
      critical: maintenance.filter((m) => m.priority === "critical").length,
    },
    unreadNotifications: notifications.length,
  };
  return JSON.stringify({
    generatedAt: new Date().toISOString(),
    counts,
    analytics,
    recentTrips: trips.slice(0, 10).map(tripDto),
    atRiskVehicles: vehicles
      .filter((v) => v.status === "in_shop" || v.odometerKm > 150000)
      .slice(0, 10)
      .map(vehicleDto),
    complianceDrivers: drivers
      .filter((d) => d.status === "suspended" || d.licenceExpiry < new Date())
      .slice(0, 10)
      .map(driverDto),
    activeMaintenance: maintenance
      .filter((m) => m.status === "open" || m.status === "in_progress")
      .slice(0, 10)
      .map(maintenanceDto),
    recentFuelLogs: fuel.slice(0, 8).map(fuelDto),
    recentExpenses: expenses.slice(0, 8).map(expenseDto),
    unreadNotifications: notifications.map(notificationDto),
  });
}

async function askGroq(messages: GroqMessage[]) {
  if (!env.GROQ_API_KEY) {
    throw new ApiError(
      "AI_UNAVAILABLE",
      "GROQ_API_KEY is not configured.",
      503,
    );
  }
  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.GROQ_MODEL,
        messages,
        temperature: 0.3,
        max_tokens: 900,
      }),
    },
  );
  const body = (await response.json().catch(() => ({}))) as GroqResponse;
  if (!response.ok) {
    throw new ApiError(
      "AI_PROVIDER_ERROR",
      body.error?.message ?? "Groq request failed.",
      502,
    );
  }
  const answer = body.choices?.[0]?.message?.content?.trim();
  if (!answer)
    throw new ApiError(
      "AI_EMPTY_RESPONSE",
      "Groq returned an empty response.",
      502,
    );
  return answer;
}

api.post(
  "/ai/operations-summary",
  currentUser,
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        prompt: z.string().min(1).max(4000),
        history: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string().min(1).max(4000),
            }),
          )
          .max(12)
          .optional()
          .default([]),
      })
      .parse(req.body);
    const context = await copilotContext();
    const messages: GroqMessage[] = [
      {
        role: "system",
        content:
          "You are TransitOps Copilot, a concise ERP assistant for fleet, driver, dispatch, maintenance, fuel, expenses, analytics, and notifications. Answer every user question helpfully. Use the supplied live database context when relevant. If the answer needs an action, explain the exact page or workflow to use. Do not claim you changed data, dispatched trips, or bypassed business rules.",
      },
      {
        role: "system",
        content: `Live TransitOps database context JSON:\n${context}`,
      },
      ...body.history.map((m): GroqMessage => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: body.prompt },
    ];
    const answer = await askGroq(messages);
    ok(res, {
      answer,
      sources: ["groq", "database-context", "analytics", "operations"],
    });
  }),
);
api.post(
  "/ai/explain-dispatch-block",
  asyncHandler(async (req, res) =>
    ok(res, {
      answer:
        (await dispatchIssues(prisma, req.body))
          .map((i) => i.message)
          .join(" ") || "Dispatch checks passed.",
      sources: ["dispatch-rules"],
    }),
  ),
);
api.post(
  "/ai/fleet-insights",
  asyncHandler(async (_req, res) =>
    ok(res, {
      answer:
        "Fleet insights are generated from deterministic backend metrics in this local mode.",
      sources: ["vehicles", "trips"],
    }),
  ),
);
api.post(
  "/ai/maintenance-summary",
  asyncHandler(async (_req, res) =>
    ok(res, {
      answer:
        "Maintenance summary is available from active maintenance records.",
      sources: ["maintenance"],
    }),
  ),
);

app.use("/api/v1", api);
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup({
    openapi: "3.0.0",
    info: { title: "TransitOps API", version: "1.0.0" },
    paths: {},
  }),
);
app.use(errorHandler);

export { app };

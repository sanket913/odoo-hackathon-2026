import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { prisma } from "./db.js";
import { env } from "./config/env.js";
import { ApiError } from "./errors.js";

export type AuthUser = { id: string; role: string; email: string };

declare global {
  namespace Express {
    interface Request { user?: AuthUser; correlationId?: string }
  }
}

export const REFRESH_COOKIE = "transitops_refresh";

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signAccessToken(user: AuthUser) {
  return jwt.sign(user, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN } as SignOptions);
}

export function makeRefreshToken() {
  return crypto.randomBytes(48).toString("base64url");
}

export function refreshCookieOptions() {
  return { httpOnly: true, secure: env.COOKIE_SECURE, sameSite: "lax" as const, path: "/api/v1/auth" };
}

export async function currentUser(req: Request, _res: Response, next: NextFunction) {
  const header = req.get("authorization");
  if (!header?.startsWith("Bearer ")) return next(new ApiError("UNAUTHORIZED", "Authentication required.", 401));
  try {
    req.user = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET) as AuthUser;
    return next();
  } catch {
    return next(new ApiError("TOKEN_INVALID", "Invalid or expired token.", 401));
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new ApiError("UNAUTHORIZED", "Authentication required.", 401));
    if (!roles.includes(req.user.role) && req.user.role !== "admin") return next(new ApiError("FORBIDDEN", "Insufficient permission.", 403));
    return next();
  };
}

export async function audit(req: Request, action: string, entityType: string, entityId?: string, metadata?: object) {
  await prisma.auditLog.create({
    data: {
      actorUserId: req.user?.id,
      action,
      entityType,
      entityId,
      metadata: metadata ?? undefined,
      correlationId: req.correlationId,
      ip: req.ip,
      userAgent: req.get("user-agent")
    }
  }).catch(() => undefined);
}

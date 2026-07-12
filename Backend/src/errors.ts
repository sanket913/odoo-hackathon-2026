import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
    public fields?: Record<string, string[]>
  ) {
    super(message);
  }
}

export function ok<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({ success: true, data });
}

export function paged<T>(res: Response, data: T[], page: number, limit: number, total: number) {
  return res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 0 } });
}

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => void fn(req, res, next).catch(next);
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    const fields: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const key = issue.path.join(".") || "root";
      (fields[key] ??= []).push(issue.message);
    }
    return res.status(422).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Validation failed.", fields } });
  }
  if (err instanceof ApiError) {
    return res.status(err.status).json({ success: false, error: { code: err.code, message: err.message, fields: err.fields } });
  }
  return res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: "Unexpected server error." } });
}

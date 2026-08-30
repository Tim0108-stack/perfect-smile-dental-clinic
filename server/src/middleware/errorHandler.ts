import type { NextFunction, Request, Response } from "express";

/** Thrown by route/controller code to produce a specific HTTP status. */
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

/** 404 handler — placed after all routes are registered. */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      message: `Not found: ${req.method} ${req.originalUrl}`,
      status: 404,
    },
  });
}

/** Centralized error handler — placed last in the middleware chain. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = err instanceof ApiError ? err.status : 500;
  const message =
    err instanceof Error ? err.message : "Unexpected server error";

  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error("[server] unhandled error:", err);
  }

  res.status(status).json({
    error: {
      message,
      status,
    },
  });
}

import { NextResponse, type NextRequest } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";

export type ApiErrorCode = "VALIDATION" | "NOT_FOUND" | "INTERNAL";

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string; details?: unknown };
}

/** Application error with an HTTP status and a stable machine-readable code. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details?: unknown;

  constructor(status: number, code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function notFound(message = "Resource not found"): ApiError {
  return new ApiError(404, "NOT_FOUND", message);
}

export function validationError(message: string, details?: unknown): ApiError {
  return new ApiError(400, "VALIDATION", message, details);
}

const NO_STORE = { "Cache-Control": "no-store" } as const;

/** Map any thrown value to the central `{ error: { code, message, details? } }` envelope. */
export function serializeError(err: unknown): NextResponse<ApiErrorBody> {
  if (err instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          code: err.code,
          message: err.message,
          ...(err.details !== undefined ? { details: err.details } : {}),
        },
      },
      { status: err.status, headers: NO_STORE },
    );
  }

  if (err instanceof z.ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION",
          message: "Request validation failed",
          details: z.flattenError(err),
        },
      },
      { status: 400, headers: NO_STORE },
    );
  }

  if (err instanceof mongoose.Error.ValidationError || err instanceof mongoose.Error.CastError) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: err.message } },
      { status: 400, headers: NO_STORE },
    );
  }

  console.error("Unhandled route error:", err);
  return NextResponse.json(
    { error: { code: "INTERNAL", message: "Internal server error" } },
    { status: 500, headers: NO_STORE },
  );
}

type RouteParams = Record<string, string>;

/**
 * Wrap a route handler: run it, guarantee `Cache-Control: no-store` on the response,
 * and serialize any thrown error through {@link serializeError}.
 *
 * The context arg is optional so the wrapped function satisfies both the
 * collection-route signature `(req)` and the dynamic-route signature
 * `(req, { params })` that Next's route type-check expects.
 */
export function handleRoute<P extends RouteParams = RouteParams>(
  fn: (req: NextRequest, ctx: { params: Promise<P> }) => Promise<Response> | Response,
): (req: NextRequest, ctx?: { params: Promise<P> }) => Promise<Response> {
  return async (req, ctx) => {
    try {
      const res = await fn(req, ctx as { params: Promise<P> });
      res.headers.set("Cache-Control", "no-store");
      return res;
    } catch (err) {
      return serializeError(err);
    }
  };
}

/**
 * Typed fetch wrapper for client components.
 * Talks to the Route Handlers under `/api`, always uncached, and normalizes the
 * `{ error: { code, message, details? } }` envelope into a thrown `ApiClientError`.
 */

export interface ApiErrorShape {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, shape: ApiErrorShape) {
    super(shape.message || `요청이 실패했습니다 (${status}).`);
    this.name = "ApiClientError";
    this.status = status;
    this.code = shape.code || "UNKNOWN";
    this.details = shape.details;
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      cache: "no-store",
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiClientError(0, {
      code: "NETWORK",
      message: "네트워크 요청에 실패했습니다.",
    });
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  const body = text ? parseJson(text) : undefined;

  if (!res.ok) {
    const envelope = (body as { error?: ApiErrorShape } | undefined)?.error;
    throw new ApiClientError(
      res.status,
      envelope ?? {
        code: `HTTP_${res.status}`,
        message: `요청이 실패했습니다 (${res.status}).`,
      },
    );
  }

  return body as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, { method: "GET" });
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: "POST", body: JSON.stringify(body) });
}

export function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: "PATCH", body: JSON.stringify(body) });
}

export function apiDelete(path: string): Promise<void> {
  return request<void>(path, { method: "DELETE" });
}

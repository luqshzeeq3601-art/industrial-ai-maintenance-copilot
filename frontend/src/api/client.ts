import { API_BASE } from "../config";
import { notifySessionExpired } from "./auth";

/** A failed API call with the server's user-facing `detail` when it sent one. */
export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const CSRF_COOKIE = "copilot_csrf";

/** The double-submit CSRF token the API set at sign-in. */
export function csrfToken(): string | null {
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${CSRF_COOKIE}=`));
  return match ? decodeURIComponent(match.slice(CSRF_COOKIE.length + 1)) : null;
}

type Query = Record<string, string | number | boolean | null | undefined>;

export function withQuery(path: string, query?: Query): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

async function detailOf(resp: Response): Promise<string> {
  try {
    const body = await resp.json();
    if (typeof body?.detail === "string") return body.detail;
    // FastAPI validation errors: [{ msg, loc }]
    if (Array.isArray(body?.detail) && body.detail[0]?.msg) return String(body.detail[0].msg);
  } catch {
    // Non-JSON error body
  }
  return `Request failed (status ${resp.status}).`;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  query?: Query;
  signal?: AbortSignal;
}

/** JSON request against the API with cookies, CSRF on mutations, and 401 → session expiry. */
export async function api<T>(path: string, { method = "GET", body, query, signal }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (method !== "GET") {
    const token = csrfToken();
    if (token) headers["X-CSRF-Token"] = token;
  }
  let resp: Response;
  try {
    resp = await fetch(`${API_BASE}${withQuery(path, query)}`, {
      method,
      headers,
      credentials: "include",
      body: body === undefined ? undefined : JSON.stringify(body),
      signal
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new ApiError(0, "Can't reach the maintenance service. Check your connection and try again.");
  }
  if (resp.status === 401) notifySessionExpired();
  if (!resp.ok) throw new ApiError(resp.status, await detailOf(resp));
  return (await resp.json()) as T;
}

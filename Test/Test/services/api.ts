// services/tokenStorage.ts is your project's existing token store
// (confirmed exports: loadToken, clearToken). The save function's name is
// currently a guess — fix this one import if it doesn't match yours; every
// other file gets the token through setAuthToken() below, so it's the only
// place that needs correcting.
import { clearToken, loadToken, saveToken } from "./tokenStorage";

// Point this at your FastAPI server. On a physical device / Expo Go,
// "127.0.0.1" means the phone itself — use your machine's LAN IP instead,
// e.g. "http://192.168.1.20:8000". Override per-environment with
// EXPO_PUBLIC_API_URL so you don't have to edit this file per machine.
const BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:8000"
).replace(/\/+$/, "");

export const API_BASE_URL = BASE_URL;

/** Resolves a backend-returned asset or relative path to a full URL. */
export function resolveAssetUrl(assetPath: string | null | undefined): string | null {
  if (!assetPath) return null;

  if (
    assetPath.startsWith("http://") ||
    assetPath.startsWith("https://") ||
    assetPath.startsWith("blob:") ||
    assetPath.startsWith("data:") ||
    assetPath.startsWith("file:")
  ) {
    return assetPath;
  }

  if (assetPath.startsWith("/")) {
    return `${BASE_URL}${assetPath}`;
  }

  // Domain without protocol (e.g. aqualens.msdfar.com/static/...)
  if (/^[^/]+\.[a-z]{2,}(?:\/|$)/i.test(assetPath)) {
    return `http://${assetPath}`;
  }

  return `${BASE_URL}/${assetPath}`;
}

const REQUEST_TIMEOUT_MS = 30_000;

/** Fetch wrapper that aborts stalled requests after `timeoutMs`. */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err: any) {
    console.error(`[API Fetch Failed] ${init.method ?? "GET"} ${url}:`, err);
    if (err?.name === "AbortError") {
      throw new ApiError(
        `Request to ${url} timed out after ${timeoutMs / 1000}s. Check that the backend server is reachable.`,
        0,
      );
    }
    throw new ApiError(
      `Couldn't reach the server at ${url}. (${err?.message || "Check your connection"})`,
      0,
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

export class ApiError extends Error {
  status: number;
  errors: unknown;
  constructor(message: string, status: number, errors?: unknown) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

let authToken: string | null = null;

/** Call once at app startup (before rendering protected screens) to
 * restore a previously-saved session. */
export async function loadStoredToken(): Promise<string | null> {
  authToken = await loadToken();
  return authToken;
}

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    saveToken(token).catch(() => {});
  } else {
    clearToken().catch(() => {});
  }
}

export function getAuthToken() {
  return authToken;
}

type BodyType = "json" | "urlencoded" | "multipart";

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
  body?: unknown;
  bodyType?: BodyType;
  /** Attach the bearer token if we have one. Default true. */
  auth?: boolean;
  /** Return the full parsed JSON body instead of unwrapping `.data` — for
   * endpoints (like GET /catches/mine) that put extra fields such as
   * `total`, `limit`, `offset` alongside the envelope. */
  raw?: boolean;
  /** Optional request timeout override in milliseconds. */
  timeoutMs?: number;
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    method = "GET",
    body,
    bodyType = "json",
    auth = true,
    raw = false,
    timeoutMs,
  } = options;

  const headers: Record<string, string> = {};
  if (auth && authToken) headers.Authorization = `Bearer ${authToken}`;

  let payload: BodyInit | undefined;
  if (body !== undefined) {
    if (bodyType === "json") {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    } else if (bodyType === "urlencoded") {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      payload = body as string;
    } else {
      // multipart/form-data — do NOT set Content-Type manually, fetch
      // needs to add the multipart boundary itself.
      payload = body as FormData;
    }
  }

  console.log(`[API Request] ${method} ${BASE_URL}${path}`);
  const res = await fetchWithTimeout(
    `${BASE_URL}${path}`,
    {
      method,
      headers,
      body: payload,
    },
    timeoutMs,
  );

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    if (!res.ok)
      throw new ApiError(`Request failed (${res.status})`, res.status);
    throw new ApiError("Unexpected server response.", res.status);
  }

  if (!res.ok) {
    // FastAPI's own validation errors (422, and framework-level 4xx/5xx
    // that never reach your route handler) come back as {"detail": ...},
    // not the app's {success,...} envelope. Surface that detail instead of
    // a generic message so failures like "file field missing" are visible.
    const detail =
      typeof json?.detail === "string"
        ? json.detail
        : Array.isArray(json?.detail)
          ? json.detail
              .map((d: any) => `${(d.loc ?? []).join(".")}: ${d.msg}`)
              .join("; ")
          : undefined;
    throw new ApiError(
      detail ?? json?.message ?? `Request failed (${res.status})`,
      res.status,
      json?.detail,
    );
  }

  // Every router in this API replies with the same envelope:
  // { success, status, message, data, errors }
  if (json && typeof json === "object" && "success" in json) {
    if (!json.success) {
      throw new ApiError(
        json.message ?? "Request failed",
        json.status ?? res.status,
        json.errors,
      );
    }
    return (raw ? json : json.data) as T;
  }

  return json as T;
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "PATCH", body }),
  delete: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "DELETE" }),
};

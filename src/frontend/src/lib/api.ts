import { supabase } from "./supabase";

function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") {
    return `http://${window.location.hostname}:3001/api/v1`;
  }
  return "http://localhost:3001/api/v1";
}

export const API_BASE = getApiBase();

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public error: string,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({}));

  if (res.status === 401) {
    // Skip 401 redirect for auth endpoints (login, register) — user is not yet authenticated
    const url = res.url || "";
    if (url.includes("/auth/login") || url.includes("/auth/register")) {
      throw new ApiError(
        401,
        json.error || "INVALID_CREDENTIALS",
        json.message || "Credenciales inválidas"
      );
    }

    // Clear tokens on unauthorized for protected endpoints
    if (typeof window !== "undefined") {
      await supabase.auth.signOut();
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("role");
      localStorage.removeItem("pseudonym");
      document.cookie = "access_token=; path=/; max-age=0";
      document.cookie = "role=; path=/; max-age=0";
      window.location.href = "/login";
    }
    throw new ApiError(401, "UNAUTHORIZED", "Sesión expirada");
  }

  if (!res.ok) {
    throw new ApiError(
      res.status,
      json.error || "UNKNOWN_ERROR",
      json.message || "Error desconocido"
    );
  }

  return json.data as T;
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  token?: string
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  return handleResponse<T>(res);
}

export async function apiPatch<T>(
  path: string,
  body: unknown,
  token?: string
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });

  return handleResponse<T>(res);
}

export async function apiDelete<T>(
  path: string,
  body?: unknown,
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  return handleResponse<T>(res);
}

export async function apiGet<T>(
  path: string,
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers,
  });

  return handleResponse<T>(res);
}

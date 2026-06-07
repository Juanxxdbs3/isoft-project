function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") {
    return `http://${window.location.hostname}:3001/api/v1`;
  }
  return "http://localhost:3001/api/v1";
}

const API_BASE = getApiBase();

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

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      res.status,
      json.error || "UNKNOWN_ERROR",
      json.message || "Error desconocido"
    );
  }

  return json.data as T;
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

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      res.status,
      json.error || "UNKNOWN_ERROR",
      json.message || "Error desconocido"
    );
  }

  return json.data as T;
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

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      res.status,
      json.error || "UNKNOWN_ERROR",
      json.message || "Error desconocido"
    );
  }

  return json.data as T;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("accountant_os_token");
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem("accountant_os_token", token);
  else window.localStorage.removeItem("accountant_os_token");
}

// Thin fetch wrapper for the Professional Accountant OS API (apps/api).
// Every call attaches the bearer token from local storage (if present) and
// normalizes error bodies into an ApiError so callers can render
// `err.message` directly.
export async function api<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const { method = "GET", body, auth = true } = options;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}/api/v1${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json().catch(() => undefined) : undefined;

  if (!res.ok) {
    const message = (data && (data.message as string)) || res.statusText || "Request failed";
    throw new ApiError(Array.isArray(message) ? message.join(", ") : message, res.status);
  }

  return data as T;
}

export function uploadUrl(clientId: string, documentId: string) {
  return `${API_URL}/api/v1/clients/${clientId}/documents/${documentId}/download`;
}

export async function uploadDocument(clientId: string, file: File, category?: string) {
  const token = getToken();
  const form = new FormData();
  form.append("file", file);
  if (category) form.append("category", category);

  const res = await fetch(`${API_URL}/api/v1/clients/${clientId}/documents`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.message ?? "Upload failed", res.status);
  }
  return res.json();
}

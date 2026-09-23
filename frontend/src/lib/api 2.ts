import { clearSession, getToken } from "./session";
import { toastError } from "./toast";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5069").replace(/\/$/, "");

// fetch() for the NoteVault API: prefixes the API URL, sends the login token and JSON headers,
// and signs the user out if the server says the session is no longer valid.
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });

  if (res.status === 401 && token && typeof window !== "undefined") {
    clearSession();
    window.location.href = "/?expired=1";
  }
  return res;
}

// The error message from a failed API response.
export async function errorMessage(res: Response, fallback = "Something went wrong. Please try again.") {
  try {
    const data = await res.json();
    return data?.error || data?.message || fallback;
  } catch {
    return fallback;
  }
}

export const NETWORK_ERROR = `Can't reach the NoteVault server at ${API_URL}. Check your connection and try again.`;

// For mutations: returns the parsed JSON on success, or shows the server's error as a toast and returns null.
export async function apiAction<T = any>(path: string, init: RequestInit, fallbackError?: string): Promise<T | null> {
  try {
    const res = await apiFetch(path, init);
    if (!res.ok) {
      toastError(await errorMessage(res, fallbackError));
      return null;
    }
    return res.status === 204 ? ({} as T) : ((await res.json()) as T);
  } catch {
    toastError(NETWORK_ERROR);
    return null;
  }
}

import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "@/config/api";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string,
    public readonly raw?: unknown
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

type FailedRequest = {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
};

let isRefreshing = false;
const failedQueue: FailedRequest[] = [];

function processQueue(token: string | null, error: unknown) {
  for (const pending of failedQueue) {
    if (token) pending.resolve(token);
    else pending.reject(error);
  }
  failedQueue.length = 0;
}

async function refreshAccessToken(): Promise<string> {
  const refreshToken = await AsyncStorage.getItem("refreshToken");
  if (!refreshToken) throw new ApiError(401, "Sessão expirada");

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) throw new ApiError(401, "Sessão expirada");

  const data = await response.json();
  if (!data.token) throw new ApiError(401, "Sessão expirada");

  await AsyncStorage.setItem("userToken", data.token);
  if (data.refresh_token) {
    await AsyncStorage.setItem("refreshToken", data.refresh_token);
  }
  return data.token as string;
}

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem("userToken");
}

function buildHeaders(
  token: string | null,
  extra?: HeadersInit
): Headers {
  const headers = new Headers(extra);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return headers;
}

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { detail: text };
  }
}

function extractDetail(data: unknown): string {
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (typeof d.detail === "string") return d.detail;
    if (typeof d.error === "string") return d.error;
  }
  return "Erro desconhecido";
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const headers = buildHeaders(token, options.headers);
  let response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (response.status === 401 && !path.startsWith("/auth/refresh")) {
    if (isRefreshing) {
      const newToken = await new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      });
      const retryHeaders = buildHeaders(newToken, options.headers);
      response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers: retryHeaders });
    } else {
      isRefreshing = true;
      try {
        const newToken = await refreshAccessToken();
        processQueue(newToken, null);
        const retryHeaders = buildHeaders(newToken, options.headers);
        response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers: retryHeaders });
      } catch (err) {
        processQueue(null, err);
        await AsyncStorage.multiRemove(["userToken", "refreshToken"]);
        throw err;
      } finally {
        isRefreshing = false;
      }
    }
  }

  const data = await parseResponse(response);

  if (!response.ok) {
    throw new ApiError(response.status, extractDetail(data), data);
  }

  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (d.detail && !d.error) {
      d.error = typeof d.detail === "string" ? d.detail : JSON.stringify(d.detail);
    }
  }

  return data as T;
}

export async function apiRequestRaw(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getToken();
  const headers = buildHeaders(token, options.headers);
  return fetch(`${API_BASE_URL}${path}`, { ...options, headers });
}

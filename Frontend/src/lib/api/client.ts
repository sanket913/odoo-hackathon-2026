// Centralised API layer. Switch VITE_USE_MOCK_API=true only for Lovable preview mocks.
// Components import service modules, never the mock store or axios directly.

import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig } from "axios";
import type { ApiError, Paginated } from "@/types/domain";

const USE_MOCK = import.meta.env.VITE_USE_MOCK_API === "true";
const BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:5000/api/v1";
const TOKEN_KEY = "transitops.token";
const USER_KEY = "transitops.user";

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T | { items?: T; data?: T; pagination?: unknown };
  pagination?: unknown;
}

interface RetriableRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

export const http: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  withCredentials: true,
});

http.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (token) config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

let refreshPromise: Promise<string> | null = null;

function isAuthBypass(url = "") {
  return [
    "/auth/login",
    "/auth/refresh",
    "/auth/logout",
    "/auth/forgot-password",
    "/auth/reset-password",
  ].some((path) => url.includes(path));
}

async function refreshAccessToken() {
  refreshPromise ??= axios
    .post<ApiEnvelope<{ token: string; user: unknown }>>(
      `${BASE_URL}/auth/refresh`,
      {},
      { withCredentials: true, timeout: 15000 },
    )
    .then((res) => {
      const payload = unwrapData<{ token: string; user: unknown }>(res.data);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(TOKEN_KEY, payload.token);
        window.localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
      }
      return payload.token;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

http.interceptors.response.use(
  (res) => res,
  async (err: AxiosError<{ error?: ApiError }>) => {
    const config = err.config as RetriableRequestConfig | undefined;
    const status = err.response?.status;
    if (
      status === 401 &&
      config &&
      !config._retry &&
      !isAuthBypass(config.url) &&
      typeof window !== "undefined"
    ) {
      try {
        config._retry = true;
        const token = await refreshAccessToken();
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
        return http.request(config);
      } catch {
        window.localStorage.removeItem(TOKEN_KEY);
        window.localStorage.removeItem(USER_KEY);
        if (!window.location.pathname.startsWith("/login")) window.location.assign("/login");
      }
    }
    const apiErr = err.response?.data?.error;
    if (apiErr) return Promise.reject(new ApiRuleError(apiErr));
    return Promise.reject(err);
  },
);

export const isMockMode = () => USE_MOCK;

export class ApiRuleError extends Error {
  code: string;
  fields?: Record<string, string[]>;
  constructor(err: ApiError) {
    super(err.message);
    this.code = err.code;
    this.fields = err.fields;
  }
}

export function delay<T>(ms: number, value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export function unwrapData<T>(body: ApiEnvelope<T> | T | undefined): T {
  if (body == null) return undefined as T;
  if (typeof body === "object" && "data" in body) {
    const data = (body as ApiEnvelope<T>).data;
    if (
      data &&
      typeof data === "object" &&
      "items" in data &&
      (data as { items?: unknown }).items !== undefined
    ) {
      return (data as { items: T }).items;
    }
    if (
      data &&
      typeof data === "object" &&
      "data" in data &&
      (data as { data?: unknown }).data !== undefined
    ) {
      return (data as { data: T }).data;
    }
    return data as T;
  }
  return body as T;
}

export function unwrapList<T>(body: ApiEnvelope<T[]> | T[] | undefined): T[] {
  const data = unwrapData<T[] | { items?: T[] }>(body);
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && Array.isArray(data.items)) return data.items;
  return [];
}

export function unwrapPaginated<T>(body: ApiEnvelope<T[]> | undefined): Paginated<T> {
  const envelope = (body ?? {}) as ApiEnvelope<T[]>;
  const data = envelope.data;
  const nested = data && typeof data === "object" && !Array.isArray(data) ? data : undefined;
  const items = unwrapList<T>(body);
  const pagination =
    (nested as { pagination?: Paginated<T>["pagination"] } | undefined)?.pagination ??
    (envelope.pagination as Paginated<T>["pagination"] | undefined);
  return {
    data: items,
    pagination: pagination ?? {
      page: 1,
      limit: items.length,
      total: items.length,
      totalPages: 1,
    },
  };
}

export function unwrapVoid(): void {
  return undefined;
}

export function unwrapBlob(body: Blob): Blob {
  return body;
}

// Small artificial latency to make loading states visible.
export const MOCK_LATENCY_MS = 250;

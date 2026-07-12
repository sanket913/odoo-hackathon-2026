// Centralised API layer. Switch VITE_USE_MOCK_API=false to hit the real backend.
// Components import service modules, never the mock store or axios directly.

import axios, { AxiosError, type AxiosInstance } from "axios";
import type { ApiError } from "@/types/domain";

const USE_MOCK = (import.meta.env.VITE_USE_MOCK_API ?? "true") === "true";
const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

export const http: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  withCredentials: true,
});

http.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("transitops.token");
    if (token) config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (err: AxiosError<{ error?: ApiError }>) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      window.localStorage.removeItem("transitops.token");
      window.localStorage.removeItem("transitops.user");
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

// Small artificial latency to make loading states visible.
export const MOCK_LATENCY_MS = 250;

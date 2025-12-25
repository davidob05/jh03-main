const stripTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const envBase = typeof import.meta !== "undefined" ? import.meta.env?.VITE_API_URL : undefined;
const browserOrigin = typeof window !== "undefined" ? window.location.origin : undefined;
const defaultBase = "http://localhost:8000";
const frontendDevPorts = ["3000", "5173", "4173"];

const rawBaseUrl =
  envBase ||
  // When running the Vite dev server without VITE_API_URL, point to Django on 8000.
  (browserOrigin && frontendDevPorts.some((port) => browserOrigin.endsWith(`:${port}`)) ? defaultBase : browserOrigin) ||
  defaultBase;

const normalisedBase = stripTrailingSlash(rawBaseUrl);

export const apiBaseUrl = normalisedBase.endsWith("/api")
  ? normalisedBase
  : `${normalisedBase}/api`;

export const authTokenKey = "authToken";
export const authUserKey = "authUser";

export type AuthUser = {
  id?: number;
  email?: string;
  username?: string;
  is_staff?: boolean;
  is_superuser?: boolean;
  role?: string;
};

const parseStoredUser = (): AuthUser | null => {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(authUserKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch (_err) {
    return null;
  }
};

export const getStoredUser = (): AuthUser | null => parseStoredUser();
export const getStoredRole = (): string | null => {
  const user = parseStoredUser();
  if (!user) return null;
  if (user.role) return user.role;
  if (user.is_staff || user.is_superuser) return "admin";
  return "invigilator";
};

const normalizeHeaders = (headers?: HeadersInit): Record<string, string> => {
  if (!headers) return {};
  if (headers instanceof Headers) {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  return { ...headers };
};

const withAuthHeader = (headers?: HeadersInit): HeadersInit => {
  const base = normalizeHeaders(headers);
  const token = typeof localStorage !== "undefined" ? localStorage.getItem(authTokenKey) : null;
  if (token) {
    base.Authorization = `Token ${token}`;
  }
  return base;
};

export const apiFetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
  const headers = withAuthHeader(init.headers);
  return fetch(input, { ...init, headers });
};

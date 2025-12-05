const stripTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const rawBaseUrl =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  (typeof window !== "undefined" ? window.location.origin : undefined) ||
  "http://localhost:8000";

const normalisedBase = stripTrailingSlash(rawBaseUrl);

export const apiBaseUrl = normalisedBase.endsWith("/api")
  ? normalisedBase
  : `${normalisedBase}/api`;

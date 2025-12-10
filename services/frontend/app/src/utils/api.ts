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

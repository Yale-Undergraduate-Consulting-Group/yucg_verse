/**
 * App-wide constants. Prefer env vars for environment-specific values.
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const HEALTH_PATH = "/health";

export const DEFAULT_HEALTH_URL = `${API_BASE_URL}${HEALTH_PATH}`;

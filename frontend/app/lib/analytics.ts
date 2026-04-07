/**
 * Analytics: thin wrapper around the backend event tracking endpoint.
 * Fire-and-forget — never throws, never blocks the caller.
 *
 * Automatically attaches a persistent client_id (localStorage, survives across
 * sessions) and a per-session session_id (sessionStorage, resets on tab close)
 * to every event so the backend can count unique users and sessions.
 */

import { API_BASE_URL } from "./constants";

type Metadata = Record<string, string | number | boolean | null>;

function getOrCreate(storage: Storage, key: string): string {
  let id = storage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    storage.setItem(key, id);
  }
  return id;
}

function getClientId(): string {
  if (typeof window === "undefined") return "";
  return getOrCreate(localStorage, "yucg_client_id");
}

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  return getOrCreate(sessionStorage, "yucg_session_id");
}

export function trackEvent(event_type: string, metadata: Metadata = {}): void {
  const enriched: Metadata = {
    ...metadata,
    client_id: getClientId(),
    session_id: getSessionId(),
  };
  fetch(`${API_BASE_URL}/api/analytics/event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event_type, metadata: enriched }),
  }).catch(() => {
    // Silently ignore analytics errors — never break the user experience
  });
}

export function trackPageView(page: string): void {
  trackEvent("page_view", { page });
}

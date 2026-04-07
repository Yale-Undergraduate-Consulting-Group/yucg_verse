/**
 * Analytics: thin wrapper around the backend event tracking endpoint.
 * Fire-and-forget — never throws, never blocks the caller.
 */

import { API_BASE_URL } from "./constants";

type Metadata = Record<string, string | number | boolean | null>;

export function trackEvent(event_type: string, metadata: Metadata = {}): void {
  fetch(`${API_BASE_URL}/api/analytics/event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event_type, metadata }),
  }).catch(() => {
    // Silently ignore analytics errors — never break the user experience
  });
}

export function trackPageView(page: string): void {
  trackEvent("page_view", { page });
}

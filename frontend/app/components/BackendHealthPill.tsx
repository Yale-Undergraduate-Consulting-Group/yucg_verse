"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const DEFAULT_HEALTH_URL = `${API_BASE}/health`;

export interface BackendHealthPillProps {
  /** When true, only the status dot is shown (e.g. in a collapsed sidebar). */
  collapsed?: boolean;
  /** Override the health check URL. */
  healthUrl?: string;
  /** Polling interval in ms. Set to 0 to disable polling. */
  intervalMs?: number;
}

export default function BackendHealthPill({
  collapsed = false,
  healthUrl = DEFAULT_HEALTH_URL,
  intervalMs = 15000,
}: BackendHealthPillProps) {
  const [up, setUp] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);
    const start = Date.now();
    try {
      const res = await fetch(healthUrl);
      setUp(res.ok);
    } catch {
      setUp(false);
    } finally {
      const elapsed = Date.now() - start;
      const minSpinMs = 400;
      if (elapsed < minSpinMs) {
        setTimeout(() => setChecking(false), minSpinMs - elapsed);
      } else {
        setChecking(false);
      }
    }
  }, [healthUrl]);

  useEffect(() => {
    check();
    if (intervalMs > 0) {
      const interval = setInterval(check, intervalMs);
      return () => clearInterval(interval);
    }
  }, [check, intervalMs]);

  const title =
    up === null
      ? "Checking…"
      : up
        ? "Backend connected. Click to recheck."
        : "Backend unreachable. Click to recheck.";
  const label = up === null ? "Checking…" : up ? "Backend" : "Offline";

  return (
    <button
      type="button"
      onClick={check}
      disabled={checking}
      className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-80 ${
        up === null
          ? "bg-surface text-text-tertiary"
          : up
            ? "bg-emerald-500/15 text-emerald-700"
            : "bg-red-500/15 text-red-600"
      }`}
      title={title}
      aria-label={title}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
          up === null
            ? "bg-text-tertiary animate-pulse"
            : up
              ? "bg-emerald-600"
              : "bg-red-500"
        }`}
      />
      {!collapsed && (
        <>
          <span>{label}</span>
          <RefreshCw
            className={`h-3 w-3 shrink-0 opacity-70 ${checking ? "animate-spin" : ""}`}
            aria-hidden
          />
        </>
      )}
    </button>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { RefreshCw } from "lucide-react";
import { DEFAULT_HEALTH_URL } from "@/app/lib/constants";

export interface BackendHealthPillProps {
  /** When true, only the status dot is shown (e.g. in a collapsed sidebar). */
  collapsed?: boolean;
  /** Override the health check URL. */
  healthUrl?: string;
  /** Polling interval in ms. Set to 0 to disable polling. */
  intervalMs?: number;
}

function getErrorMessage(err: unknown): string {
  if (err instanceof TypeError && err.message.includes("fetch")) {
    return "Could not reach the server. Check the URL and that the backend is running.";
  }
  if (err instanceof Error) return err.message;
  return "Connection failed.";
}

export default function BackendHealthPill({
  collapsed = false,
  healthUrl = DEFAULT_HEALTH_URL,
  intervalMs = 15000,
}: BackendHealthPillProps) {
  const [up, setUp] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const check = useCallback(async () => {
    setChecking(true);
    setErrorMessage(null);
    try {
      const res = await fetch(healthUrl);
      setUp(res.ok);
      if (!res.ok) {
        setErrorMessage(`Server returned ${res.status}`);
      }
    } catch (err) {
      setUp(false);
      setErrorMessage(getErrorMessage(err));
    } finally {
      setChecking(false);
    }
  }, [healthUrl]);

  useEffect(() => {
    check();
    if (intervalMs > 0) {
      const interval = setInterval(check, intervalMs);
      return () => clearInterval(interval);
    }
  }, [check, intervalMs]);

  useEffect(() => {
    if (!popupOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setPopupOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [popupOpen]);

  const label =
    up === null ? "Checking…" : up ? "Backend Online" : "Backend Offline";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setPopupOpen((o) => !o)}
        className={`flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition-opacity hover:opacity-90 ${
          up === null
            ? "bg-surface text-text-tertiary"
            : up
              ? "bg-emerald-500/15 text-emerald-700"
              : "bg-red-500/15 text-red-600"
        }`}
        title={
          up === null
            ? "Checking…"
            : up
              ? "Backend connected"
              : "Click for details"
        }
        aria-label={
          up === null
            ? "Checking"
            : up
              ? "Backend connected"
              : "Backend offline"
        }
        aria-expanded={popupOpen}
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
        {!collapsed && <span>{label}</span>}
      </button>

      {popupOpen && (
        <div
          className="absolute bottom-full left-0 z-50 mb-2 w-64 rounded-lg border border-[var(--border)] bg-background-alt p-3 text-left shadow-lg"
          role="dialog"
          aria-label="Backend status"
        >
          {up === null && (
            <p className="text-xs text-text-secondary">Checking connection…</p>
          )}
          {up === true && (
            <>
              <p className="text-xs font-medium text-emerald-700">
                Backend connected
              </p>
              <p className="mt-1 text-xs text-text-secondary">{healthUrl}</p>
              <button
                type="button"
                onClick={() => check()}
                disabled={checking}
                className="mt-2 flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-accent hover:bg-accent-muted disabled:opacity-60"
              >
                <RefreshCw className="h-3 w-3" />
                Recheck
              </button>
            </>
          )}
          {up === false && (
            <>
              <p className="text-xs font-medium text-red-600">
                Backend unreachable
              </p>
              {errorMessage && (
                <p className="mt-1 text-xs text-text-secondary">
                  {errorMessage}
                </p>
              )}
              <p className="mt-1 text-xs text-text-tertiary">{healthUrl}</p>
              <button
                type="button"
                onClick={() => check()}
                disabled={checking}
                className="mt-2 flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-accent hover:bg-accent-muted disabled:opacity-60"
              >
                <RefreshCw className="h-3 w-3" />
                {checking ? "Checking…" : "Recheck"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

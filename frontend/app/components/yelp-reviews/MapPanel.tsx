"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Search, Loader2, X, Star } from "lucide-react";
import { API_BASE_URL } from "@/app/lib/constants";
import type { GBusiness } from "./types";

// Leaflet must be imported dynamically — it uses window/document
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";

interface MapPanelProps {
  selectedBusinesses: GBusiness[];
  maxLocations: number;
  onAddBusiness: (biz: GBusiness) => void;
  onRemoveBusiness: (place_id: string) => void;
  error: string | null;
}

const ACCENT_COLOR = "#6366f1";
const SELECTED_COLOR = "#10b981";

function makeIcon(L: typeof import("leaflet"), selected: boolean) {
  const color = selected ? SELECTED_COLOR : ACCENT_COLOR;
  const svg = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 22 14 22S28 23.333 28 14C28 6.268 21.732 0 14 0z"
        fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="14" cy="14" r="5" fill="white"/>
    </svg>
  `);
  return L.icon({
    iconUrl:     `data:image/svg+xml,${svg}`,
    iconSize:    [28, 36],
    iconAnchor:  [14, 36],
    popupAnchor: [0, -36],
  });
}

export default function MapPanel({
  selectedBusinesses,
  maxLocations,
  onAddBusiness,
  onRemoveBusiness,
  error,
}: MapPanelProps) {
  const mapRef     = useRef<LeafletMap | null>(null);
  const mapElRef   = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, LeafletMarker>>(new Map());
  const LRef       = useRef<typeof import("leaflet") | null>(null);

  const [query, setQuery]           = useState("");
  const [location, setLocation]     = useState("");
  const [searching, setSearching]   = useState(false);
  const [searchResults, setSearchResults] = useState<GBusiness[]>([]);
  const [searchError, setSearchError]     = useState<string | null>(null);

  // Boot Leaflet once on mount
  useEffect(() => {
    if (mapRef.current || !mapElRef.current) return;

    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !mapElRef.current || mapRef.current) return;
      LRef.current = L;

      // Fix default icon path broken by webpack
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapElRef.current, { zoomControl: true }).setView([39.5, -98.35], 4);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);
      mapRef.current = map;
    });

    return () => { cancelled = true; };
  }, []);

  // Sync markers whenever search results or selection changes
  const syncMarkers = useCallback((results: GBusiness[], selected: GBusiness[]) => {
    const L   = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    const selectedIds = new Set(selected.map((b) => b.place_id));
    const resultIds   = new Set(results.map((b) => b.place_id));

    // Remove markers no longer in results or selected
    for (const [id, marker] of markersRef.current.entries()) {
      if (!resultIds.has(id) && !selectedIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }

    // Add / update markers for search results
    const allBizzes = [...results, ...selected.filter((b) => !resultIds.has(b.place_id))];
    for (const biz of allBizzes) {
      const isSelected = selectedIds.has(biz.place_id);
      const existing   = markersRef.current.get(biz.place_id);

      if (existing) {
        existing.setIcon(makeIcon(L, isSelected));
        continue;
      }

      const marker = L.marker([biz.lat, biz.lng], { icon: makeIcon(L, isSelected) })
        .addTo(map)
        .bindPopup(`
          <div style="min-width:160px">
            <strong>${biz.name}</strong><br/>
            <small>${biz.address}</small><br/>
            ${biz.rating ? `⭐ ${biz.rating} · ` : ""}${biz.review_count} reviews<br/>
            <em style="color:${isSelected ? "#dc2626" : "#6366f1"};cursor:pointer" data-id="${biz.place_id}">
              ${isSelected ? "✕ Remove" : "+ Select"}
            </em>
          </div>
        `);

      marker.on("popupopen", () => {
        setTimeout(() => {
          const el = document.querySelector(`[data-id="${biz.place_id}"]`);
          if (el) {
            el.addEventListener("click", () => {
              const sel = selectedIds.has(biz.place_id);
              if (sel) {
                onRemoveBusiness(biz.place_id);
              } else if (selected.length < maxLocations) {
                onAddBusiness(biz);
              }
              map.closePopup();
            });
          }
        }, 50);
      });

      markersRef.current.set(biz.place_id, marker);
    }

    // Fit map to visible markers if there are results
    if (allBizzes.length > 0) {
      const latLngs = allBizzes
        .filter((b) => b.lat && b.lng)
        .map((b) => [b.lat, b.lng] as [number, number]);
      if (latLngs.length > 0) {
        map.fitBounds(latLngs, { padding: [40, 40], maxZoom: 14 });
      }
    }
  }, [onAddBusiness, onRemoveBusiness, maxLocations]);

  useEffect(() => {
    syncMarkers(searchResults, selectedBusinesses);
  }, [searchResults, selectedBusinesses, syncMarkers]);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    setSearchResults([]);

    try {
      const res  = await fetch(`${API_BASE_URL}/api/google/search_places`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ query: `${query.trim()} ${location.trim()}`.trim() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Search failed");
      if (data.results.length === 0) {
        setSearchError("No results found. Try a different query or location.");
      } else {
        setSearchResults(data.results);
      }
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }, [query, location]);

  return (
    <section className="rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5 sm:p-6">
      <div className="mb-4 rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 text-sm text-text-secondary">
        <span className="font-semibold text-text-primary">Instructions:</span>{" "}
        Search for a business and location (e.g. "Starbucks New Haven CT").
        Click pins on the map to select locations for review analysis.
      </div>

      {/* Search bar */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="e.g. Starbucks"
            className="w-full rounded-xl border border-[var(--border)] bg-white/80 py-2.5 pl-10 pr-4 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <div className="relative sm:w-44">
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="City (optional)"
            className="w-full rounded-xl border border-[var(--border)] bg-white/80 py-2.5 px-4 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={searching || !query.trim()}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-accent-hover disabled:opacity-50"
        >
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {searching ? "Searching…" : "Search"}
        </button>
      </div>

      {searchError && <p className="mb-3 text-xs text-red-500">{searchError}</p>}

      {/* Map */}
      <div
        ref={mapElRef}
        className="mb-4 h-[380px] w-full overflow-hidden rounded-2xl border border-[var(--border)]"
        style={{ zIndex: 0 }}
      />

      {/* Selected chips */}
      {selectedBusinesses.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-tertiary">
              Selected Locations
            </p>
            <span className="text-xs text-text-tertiary">
              {selectedBusinesses.length}/{maxLocations}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedBusinesses.map((biz) => (
              <span
                key={biz.place_id}
                className="inline-flex items-center gap-1.5 rounded-full bg-accent-muted px-3 py-1.5 text-sm font-medium text-accent"
              >
                {biz.name}
                {biz.rating && (
                  <span className="flex items-center gap-0.5 text-xs text-amber-500">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    {biz.rating.toFixed(1)}
                  </span>
                )}
                <button
                  onClick={() => onRemoveBusiness(biz.place_id)}
                  className="rounded-full p-0.5 transition-colors hover:bg-accent/20"
                  aria-label={`Remove ${biz.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}
    </section>
  );
}

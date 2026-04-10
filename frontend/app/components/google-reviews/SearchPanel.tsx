import { Search, X, Star, Plus, Loader2 } from "lucide-react";
import { useState, useCallback } from "react";
import type { PlaceResult } from "./types";
import { API_BASE_URL } from "@/app/lib/constants";

interface SearchPanelProps {
  selectedPlaces: PlaceResult[];
  onAddPlace: (place: PlaceResult) => void;
  onRemovePlace: (place_id: string) => void;
  error: string | null;
}

function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return null;
  return (
    <span className="flex items-center gap-0.5 text-xs text-amber-500">
      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
      {rating.toFixed(1)}
    </span>
  );
}

export default function SearchPanel({
  selectedPlaces,
  onAddPlace,
  onRemovePlace,
  error,
}: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    setSearchResults([]);
    try {
      const res = await fetch(`${API_BASE_URL}/api/google/search_places`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Search failed");
      setSearchResults(data.results);
      if (data.results.length === 0) setSearchError("No places found. Try a different search.");
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }, [query]);

  const isSelected = useCallback(
    (place_id: string) => selectedPlaces.some((p) => p.place_id === place_id),
    [selectedPlaces]
  );

  return (
    <section className="rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5 sm:p-6">
      <div className="mb-5 rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3 text-sm text-text-secondary">
        <span className="font-semibold text-text-primary">Instructions:</span>{" "}
        Search for stores or locations (e.g. "Starbucks New York" or "Apple Store London").
        Select up to 5 locations to compare their review sentiment side by side.
      </div>

      {/* Search input */}
      <div className="mb-4">
        <label className="mb-1.5 block text-sm font-medium text-text-primary">
          Search Location
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="e.g. Starbucks Seattle"
              className="w-full rounded-xl border border-[var(--border)] bg-white/80 py-3 pl-10 pr-4 text-sm text-text-primary outline-none transition-all placeholder:text-text-tertiary focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching || !query.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-accent-hover disabled:opacity-50"
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {searching ? "Searching…" : "Search"}
          </button>
        </div>
        {searchError && (
          <p className="mt-2 text-xs text-red-500">{searchError}</p>
        )}
      </div>

      {/* Search results */}
      {searchResults.length > 0 && (
        <div className="mb-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-text-tertiary">
            Results — click to add
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {searchResults.map((place) => {
              const selected = isSelected(place.place_id);
              const full = selectedPlaces.length >= 5;
              return (
                <button
                  key={place.place_id}
                  onClick={() => !selected && !full && onAddPlace(place)}
                  disabled={selected || full}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${
                    selected
                      ? "border-accent/40 bg-accent-muted cursor-default"
                      : full
                      ? "border-[var(--border)] bg-white/40 opacity-40 cursor-not-allowed"
                      : "border-[var(--border)] bg-white/70 hover:border-accent/40 hover:bg-accent-muted/50 cursor-pointer"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text-primary">{place.name}</p>
                      <p className="truncate text-xs text-text-tertiary">{place.address}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StarRating rating={place.rating} />
                      {place.user_ratings_total > 0 && (
                        <span className="text-xs text-text-tertiary">
                          ({place.user_ratings_total.toLocaleString()})
                        </span>
                      )}
                      {selected ? (
                        <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-white">Added</span>
                      ) : (
                        <Plus className="h-4 w-4 shrink-0 text-accent" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected places chips */}
      {selectedPlaces.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-tertiary">
              Selected Locations
            </p>
            <span className="text-xs text-text-tertiary">{selectedPlaces.length}/5</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedPlaces.map((place) => (
              <span
                key={place.place_id}
                className="inline-flex items-center gap-1.5 rounded-full bg-accent-muted px-3 py-1.5 text-sm font-medium text-accent"
              >
                {place.name}
                <button
                  onClick={() => onRemovePlace(place.place_id)}
                  className="rounded-full p-0.5 transition-colors hover:bg-accent/20"
                  aria-label={`Remove ${place.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-5 rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}
    </section>
  );
}

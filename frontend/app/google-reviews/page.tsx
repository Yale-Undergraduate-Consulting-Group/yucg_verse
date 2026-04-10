"use client";

import { useCallback, useEffect, useState } from "react";
import {
  MapPanel,
  SettingsPanel,
  ActionPanel,
  ResultsPanel,
  type GBusiness,
  type GLocationResult,
} from "@/app/components/yelp-reviews";
import ToolHero from "@/app/components/ToolHero";
import PageViewTracker from "@/app/components/PageViewTracker";
import { API_BASE_URL } from "@/app/lib/constants";
import { trackEvent } from "@/app/lib/analytics";

const SESSION_KEY = "google_reviews_state";

function loadSession(): {
  selectedPlaces: GBusiness[];
  maxLocations: number;
  x: number;
  results: GLocationResult[] | null;
} {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { selectedPlaces: [], maxLocations: 10, x: 10, results: null };
}

export default function GoogleReviewsPage() {
  const initial = loadSession();
  const [selectedPlaces, setSelectedPlaces] = useState<GBusiness[]>(initial.selectedPlaces);
  const [maxLocations, setMaxLocations] = useState(initial.maxLocations);
  const [x, setX] = useState(initial.x);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<GLocationResult[] | null>(initial.results);
  const [error, setError] = useState<string | null>(null);

  // Persist state to sessionStorage whenever it changes
  useEffect(() => {
    try {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ selectedPlaces, maxLocations, x, results })
      );
    } catch {}
  }, [selectedPlaces, maxLocations, x, results]);

  const handleAddPlace = useCallback((biz: GBusiness) => {
    setSelectedPlaces((prev) => {
      if (prev.some((p) => p.place_id === biz.place_id) || prev.length >= maxLocations) return prev;
      return [...prev, biz];
    });
    setResults(null);
    setError(null);
  }, [maxLocations]);

  const handleRemovePlace = useCallback((place_id: string) => {
    setSelectedPlaces((prev) => prev.filter((p) => p.place_id !== place_id));
    setResults(null);
  }, []);

  const handleMaxLocationsChange = useCallback((n: number) => {
    setMaxLocations(n);
    setSelectedPlaces((prev) => prev.slice(0, n));
  }, []);

  const handleRun = useCallback(async () => {
    if (selectedPlaces.length === 0) {
      setError("Please select at least one location on the map.");
      return;
    }
    setIsRunning(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/google/analyze_reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ places: selectedPlaces, n: x }),
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Analysis failed");

      setResults(data.results);
      trackEvent("google_reviews_analysis", {
        success: true,
        place_count: selectedPlaces.length,
        n: x,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setIsRunning(false);
    }
  }, [selectedPlaces, x]);

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <PageViewTracker page="google-reviews" />
      <ToolHero
        label="Reviews Tool"
        title="Google Reviews Analyzer"
        description="Search for businesses, select locations on the map, and analyze their Google reviews with AI-powered sentiment scoring."
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        <MapPanel
          selectedBusinesses={selectedPlaces}
          maxLocations={maxLocations}
          onAddBusiness={handleAddPlace}
          onRemoveBusiness={handleRemovePlace}
          error={error}
        />

        <aside className="space-y-4">
          <SettingsPanel
            maxLocations={maxLocations}
            x={x}
            onMaxLocationsChange={handleMaxLocationsChange}
            onXChange={setX}
          />
          <ActionPanel
            isRunning={isRunning}
            disabled={isRunning || selectedPlaces.length === 0}
            onRun={handleRun}
          />
        </aside>
      </div>

      {results && <ResultsPanel results={results} x={x} />}
    </div>
  );
}

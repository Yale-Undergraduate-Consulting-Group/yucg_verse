"use client";

import { useCallback, useState } from "react";
import {
  MapPanel,
  SettingsPanel,
  ActionPanel,
  ResultsPanel,
  type YelpBusiness,
  type YelpLocationResult,
} from "@/app/components/yelp-reviews";
import ToolHero from "@/app/components/ToolHero";
import PageViewTracker from "@/app/components/PageViewTracker";
import { API_BASE_URL } from "@/app/lib/constants";
import { trackEvent } from "@/app/lib/analytics";

export default function YelpReviewsPage() {
  const [selectedBusinesses, setSelectedBusinesses] = useState<YelpBusiness[]>([]);
  const [maxLocations, setMaxLocations] = useState(3);
  const [x, setX] = useState(3);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<YelpLocationResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAddBusiness = useCallback((biz: YelpBusiness) => {
    setSelectedBusinesses((prev) => {
      if (prev.some((b) => b.biz_id === biz.biz_id) || prev.length >= maxLocations) return prev;
      return [...prev, biz];
    });
    setResults(null);
    setError(null);
  }, [maxLocations]);

  const handleRemoveBusiness = useCallback((biz_id: string) => {
    setSelectedBusinesses((prev) => prev.filter((b) => b.biz_id !== biz_id));
    setResults(null);
  }, []);

  // When maxLocations is lowered, trim excess selections
  const handleMaxLocationsChange = useCallback((n: number) => {
    setMaxLocations(n);
    setSelectedBusinesses((prev) => prev.slice(0, n));
  }, []);

  const handleRun = useCallback(async () => {
    if (selectedBusinesses.length === 0) {
      setError("Please select at least one location on the map.");
      return;
    }
    setIsRunning(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/yelp/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businesses: selectedBusinesses, x }),
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Analysis failed");

      setResults(data.results);
      trackEvent("yelp_reviews_analysis", {
        success: true,
        location_count: selectedBusinesses.length,
        x,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setIsRunning(false);
    }
  }, [selectedBusinesses, x]);

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <PageViewTracker page="yelp-reviews" />
      <ToolHero
        label="Reviews Tool"
        title="Yelp Reviews Analyzer"
        description="Search for businesses, select locations on the map, and analyze their Yelp reviews with AI-powered sentiment scoring."
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        <MapPanel
          selectedBusinesses={selectedBusinesses}
          maxLocations={maxLocations}
          onAddBusiness={handleAddBusiness}
          onRemoveBusiness={handleRemoveBusiness}
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
            disabled={isRunning || selectedBusinesses.length === 0}
            onRun={handleRun}
          />
        </aside>
      </div>

      {results && (
        <ResultsPanel results={results} x={x} />
      )}
    </div>
  );
}

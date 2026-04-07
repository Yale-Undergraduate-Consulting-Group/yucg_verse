"use client";

import { useEffect } from "react";
import { trackPageView } from "@/app/lib/analytics";

interface PageViewTrackerProps {
  page: string;
}

export default function PageViewTracker({ page }: PageViewTrackerProps) {
  useEffect(() => {
    trackPageView(page);
  }, [page]);

  return null;
}

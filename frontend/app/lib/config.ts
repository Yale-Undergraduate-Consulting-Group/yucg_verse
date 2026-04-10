/**
 * App config: navigation and tool definitions. Icons are co-located here
 * so routes and labels stay in sync with the UI.
 */

import { Home, BarChart3, MessageSquare, Activity, MapPin } from "lucide-react";
import type { SidebarNavItem, ToolConfig } from "./types";

export const defaultNavItems: SidebarNavItem[] = [
  { icon: Home,          label: "Home",                    href: "/" },
  { icon: MessageSquare, label: "Reddit Analyzer",         href: "/reddit-analyzer" },
  { icon: BarChart3,     label: "Sentiment Analyzer",      href: "/sentiment-analyzer" },
  { icon: MapPin,        label: "Google Reviews Analyzer", href: "/google-reviews" },
  { icon: Activity,      label: "Analytics",               href: "/analytics" },
];

export const defaultTools: ToolConfig[] = [
  {
    name: "Reddit Analyzer",
    description:
      "Analyze sentiment of Reddit discussions on any topic across subreddits.",
    href: "/reddit-analyzer",
    icon: MessageSquare,
  },
  {
    name: "Sentiment Analyzer",
    description:
      "Analyze interview transcripts to extract sentiment insights and patterns.",
    href: "/sentiment-analyzer",
    icon: BarChart3,
  },
  {
    name: "Google Reviews Analyzer",
    description:
      "Search for businesses on a live map and analyze their Google reviews with AI-powered sentiment scoring.",
    href: "/google-reviews",
    icon: MapPin,
  },
];

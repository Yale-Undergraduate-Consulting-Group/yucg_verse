/**
 * App config: navigation and tool definitions. Icons are co-located here
 * so routes and labels stay in sync with the UI.
 */

import { Home, BarChart3, MessageSquare } from "lucide-react";
import type { SidebarNavItem, ToolConfig } from "./types";

export const defaultNavItems: SidebarNavItem[] = [
  { icon: Home, label: "Home", href: "/" },
  { icon: BarChart3, label: "Sentiment Analyzer", href: "/sentiment-analyzer" },
  { icon: MessageSquare, label: "Reddit Analyzer", href: "/reddit-analyzer" },
];

export const defaultTools: ToolConfig[] = [
  {
    name: "Sentiment Analyzer",
    description:
      "Analyze interview transcripts to extract sentiment insights and patterns.",
    href: "/sentiment-analyzer",
    icon: BarChart3,
  },
  {
    name: "Reddit Analyzer",
    description:
      "Analyze sentiment of Reddit discussions on any topic across subreddits.",
    href: "/reddit-analyzer",
    icon: MessageSquare,
  },
];

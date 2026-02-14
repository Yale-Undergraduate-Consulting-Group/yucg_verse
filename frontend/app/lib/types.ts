/**
 * Shared types for the app. Component-specific props stay in their components.
 */

import type { LucideIcon } from "lucide-react";

export interface SidebarNavItem {
  icon: LucideIcon;
  label: string;
  href: string;
}

export interface ToolConfig {
  name: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

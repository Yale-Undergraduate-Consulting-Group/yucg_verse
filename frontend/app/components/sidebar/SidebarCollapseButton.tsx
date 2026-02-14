"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export interface SidebarCollapseButtonProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function SidebarCollapseButton({
  collapsed,
  onToggle,
}: SidebarCollapseButtonProps) {
  return (
    <button
      onClick={onToggle}
      className="absolute bottom-5 right-0 z-10 flex h-8 w-8 translate-x-1/2 items-center justify-center rounded-lg border border-[var(--border)] bg-background-alt text-text-tertiary shadow-lg transition-all duration-200 hover:border-accent/40 hover:text-accent hover:shadow-[0_0_20px_var(--accent-glow)]"
      title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      {collapsed ? (
        <ChevronRight className="h-4 w-4" />
      ) : (
        <ChevronLeft className="h-4 w-4" />
      )}
    </button>
  );
}

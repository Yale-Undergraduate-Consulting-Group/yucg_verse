"use client";

import { useState } from "react";
import { defaultNavItems } from "@/app/lib/config";
import type { SidebarNavItem } from "@/app/lib/types";
import BackendHealthPill from "./BackendHealthPill";
import SidebarCollapseButton from "./SidebarCollapseButton";
import SidebarHeader from "./SidebarHeader";
import SidebarNav from "./SidebarNav";

export interface SidebarProps {
  /** Nav items. Defaults to Home + Sentiment Analyzer. */
  navItems?: SidebarNavItem[];
}

export default function Sidebar({ navItems = defaultNavItems }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`relative flex h-full shrink-0 flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] transition-[width] duration-200 ease-out ${
        collapsed
          ? "w-[var(--sidebar-collapsed)]"
          : "w-[var(--sidebar-width)]"
      }`}
    >
      <SidebarHeader collapsed={collapsed} />
      <SidebarNav collapsed={collapsed} items={navItems} />

      <div className="mt-auto p-4">
        <BackendHealthPill collapsed={collapsed} />
      </div>

      <SidebarCollapseButton
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
      />
    </aside>
  );
}

"use client";

import { useState } from "react";
import { Home, BarChart3 } from "lucide-react";
import BackendHealthPill from "./BackendHealthPill";
import SidebarCollapseButton from "./SidebarCollapseButton";
import SidebarHeader from "./SidebarHeader";
import SidebarNav from "./SidebarNav";
import type { SidebarNavItem } from "./SidebarNav";

const defaultNavItems: SidebarNavItem[] = [
  { icon: Home, label: "Home", href: "/" },
  { icon: BarChart3, label: "Sentiment Analyzer", href: "/sentiment-analyzer" },
];

export interface SidebarProps {
  /** Nav items. Defaults to Home + Sentiment Analyzer. */
  navItems?: SidebarNavItem[];
}

export default function Sidebar({ navItems = defaultNavItems }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`relative flex h-full shrink-0 flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] transition-[width] duration-200 ease-out ${
        collapsed ? "w-14" : "w-60"
      }`}
    >
      <SidebarHeader collapsed={collapsed} />
      <SidebarNav collapsed={collapsed} items={navItems} />

      <div className="p-5">
        <BackendHealthPill collapsed={collapsed} />
      </div>

      <SidebarCollapseButton
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
      />
    </aside>
  );
}

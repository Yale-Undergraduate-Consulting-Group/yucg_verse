"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BarChart3, ChevronLeft, ChevronRight } from "lucide-react";

const navItems = [
  { icon: Home, label: "Home", href: "/" },
  { icon: BarChart3, label: "Sentiment Analyzer", href: "/sentiment-analyzer" },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={`relative flex h-full shrink-0 flex-col border-r border-border bg-sidebar-bg transition-all duration-200 ${
        collapsed ? "w-14" : "w-60"
      }`}
    >
      {/* Header — fixed-size logo area so logo never deforms when collapsed */}
      <div className="flex h-14 items-center border-b border-border px-3">
        <Link
          href="/"
          className={`flex items-center overflow-hidden ${collapsed ? "h-8 w-8 justify-center" : "gap-2"}`}
          title={collapsed ? "YUCG Analytics" : undefined}
        >
          <span
            className={`relative flex shrink-0 items-center justify-center transition-[width,height] duration-200 ${collapsed ? "h-8 w-8" : "h-12 w-12"}`}
          >
            <img
              src="/yucg-logo-transparent.png"
              alt="YUCG"
              className="h-full w-full object-contain object-center"
            />
          </span>
          {!collapsed && (
            <span className="text-xl font-semibold lowercase tracking-tight text-accent whitespace-nowrap">
              analytics
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                    isActive
                      ? "bg-accent-muted text-accent"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Collapse toggle — small rounded square overlaying sidebar right edge at bottom */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute bottom-4 right-0 z-10 flex h-7 w-7 translate-x-1/2 items-center justify-center rounded-md border border-border bg-sidebar-bg text-text-tertiary shadow-sm transition-colors hover:bg-surface-hover hover:text-text-secondary"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5" />
        )}
      </button>
    </aside>
  );
}

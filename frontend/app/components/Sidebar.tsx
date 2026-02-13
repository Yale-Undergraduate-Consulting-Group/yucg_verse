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
      className={`h-full bg-sidebar-bg border-r border-border flex flex-col transition-all duration-200 ${
        collapsed ? "w-14" : "w-60"
      }`}
    >
      {/* Header */}
      <div className="h-14 px-3 flex items-center justify-between border-b border-border">
        <Link href="/" className="flex items-center gap-2 overflow-hidden">
          <img
            src="/yucg-logo-transparent.png"
            alt="YUCG"
            className="h-8 w-auto flex-shrink-0"
          />
          {!collapsed && (
            <span className="text-lg font-semibold lowercase tracking-tight text-accent whitespace-nowrap">
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

      {/* Collapse toggle */}
      <div className="p-2 border-t border-border">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-text-tertiary hover:text-text-secondary hover:bg-surface-hover rounded-md transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

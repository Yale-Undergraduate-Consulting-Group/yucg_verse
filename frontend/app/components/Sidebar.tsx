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
      className={`relative flex h-full shrink-0 flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] transition-[width] duration-200 ease-out ${
        collapsed ? "w-14" : "w-60"
      }`}
    >
      <div className="flex h-14 items-center border-b border-[var(--sidebar-border)] px-3">
        <Link
          href="/"
          className={`flex items-center overflow-hidden ${collapsed ? "h-8 w-8 justify-center" : "gap-3"}`}
          title={collapsed ? "YUCG Analytics" : undefined}
        >
          <span className="relative flex h-12 w-12 shrink-0 items-center justify-center">
            <img
              src="/yucg-logo-transparent.png"
              alt="YUCG"
              className={`h-full w-full object-contain object-center transition-transform duration-200 ease-out ${
                collapsed ? "scale-[0.667]" : "scale-100"
              }`}
            />
          </span>
          {!collapsed && (
            <span className="font-semibold tracking-tight text-accent whitespace-nowrap text-[15px]">
              analytics
            </span>
          )}
        </Link>
      </div>

      <nav className="flex-1 py-4 px-2">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-accent-muted-strong text-accent shadow-[0_0_0_1px_var(--accent-muted-strong)]"
                      : "text-text-secondary hover:bg-surface hover:text-text-primary"
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <button
        onClick={() => setCollapsed(!collapsed)}
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
    </aside>
  );
}

"use client";

import { useState } from "react";
import { ChevronRight, BarChart3, Home } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tools = [
  { icon: BarChart3, label: "Sentiment Analyzer", href: "/sentiment-analyzer" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [toolsOpen, setToolsOpen] = useState(true);
  const [favoritesOpen, setFavoritesOpen] = useState(false);

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-sidebar-bg flex flex-col border-r border-border">
      {/* Workspace header */}
      <div className="h-20 px-4 flex items-center">
        <Link href="/" className="flex items-center gap-1">
          <img
            src="/yucg-logo-transparent.png"
            alt="YUCG"
            className="h-14 w-auto"
          />
          <span className="text-2xl font-semibold lowercase tracking-tight text-accent">analytics</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 px-3 overflow-y-auto">
        {/* Home link */}
        <Link
          href="/"
          className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors mb-2 ${
            pathname === "/"
              ? "bg-accent-muted text-accent"
              : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
          }`}
        >
          <Home className="w-4 h-4" />
          <span>Home</span>
        </Link>

        {/* Tools section */}
        <div className="mt-4">
          <button
            onClick={() => setToolsOpen(!toolsOpen)}
            className="flex items-center gap-2 px-2 py-1.5 text-text-tertiary hover:text-text-secondary w-full transition-colors"
          >
            <ChevronRight className={`w-3 h-3 transition-transform duration-150 ${toolsOpen ? "rotate-90" : ""}`} />
            <span className="text-xs font-medium uppercase tracking-wide">
              Tools
            </span>
          </button>
          {toolsOpen && (
            <ul className="mt-1 space-y-0.5">
              {tools.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                        isActive
                          ? "bg-accent-muted text-accent"
                          : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Favorites section */}
        <div className="mt-4">
          <button
            onClick={() => setFavoritesOpen(!favoritesOpen)}
            className="flex items-center gap-2 px-2 py-1.5 text-text-tertiary hover:text-text-secondary w-full transition-colors"
          >
            <ChevronRight className={`w-3 h-3 transition-transform duration-150 ${favoritesOpen ? "rotate-90" : ""}`} />
            <span className="text-xs font-medium uppercase tracking-wide">
              Favorites
            </span>
          </button>
          {favoritesOpen && (
            <p className="px-3 py-2 text-xs text-text-tertiary">
              No favorites yet
            </p>
          )}
        </div>
      </nav>
    </aside>
  );
}

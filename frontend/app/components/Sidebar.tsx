"use client";

import { ChevronDown, BarChart3, Home } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tools = [
  { icon: BarChart3, label: "Sentiment Analyzer", href: "/sentiment-analyzer" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-sidebar-bg flex flex-col">
      {/* Workspace header */}
      <div className="h-20 px-4 flex items-center border-b border-border">
        <div className="flex items-center gap-1">
          <img
            src="/yucg-logo-transparent.png"
            alt="YUCG"
            className="h-14 w-auto"
          />
          <span className="text-2xl font-semibold lowercase tracking-tight" style={{ color: '#1f376a' }}>analytics</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        {/* Home link */}
        <Link
          href="/"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors mb-4 ${
            pathname === "/"
              ? "bg-surface text-text-primary"
              : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
          }`}
        >
          <Home className="w-4 h-4" />
          <span>Home</span>
        </Link>

        {/* Tools section */}
        <div>
          <button className="flex items-center gap-2 px-2 py-1.5 text-text-tertiary hover:text-text-secondary w-full transition-colors">
            <ChevronDown className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wide">
              Tools
            </span>
          </button>
          <ul className="mt-2 space-y-1">
            {tools.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                      isActive
                        ? "bg-surface text-text-primary"
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
        </div>

        {/* Favorites section */}
        <div className="mt-8">
          <button className="flex items-center gap-2 px-2 py-1.5 text-text-tertiary hover:text-text-secondary w-full transition-colors">
            <ChevronDown className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wide">
              Favorites
            </span>
          </button>
        </div>
      </nav>
    </aside>
  );
}

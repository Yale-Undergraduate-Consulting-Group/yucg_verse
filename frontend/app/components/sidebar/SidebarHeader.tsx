"use client";

import Link from "next/link";

export interface SidebarHeaderProps {
  collapsed: boolean;
  logoSrc?: string;
  logoAlt?: string;
  brandLabel?: string;
}

export default function SidebarHeader({
  collapsed,
  logoSrc = "/y-logo.png",
  logoAlt = "YUCG",
  brandLabel = "YUCG Analytics",
}: SidebarHeaderProps) {
  return (
    <div className="flex h-[72px] items-center border-b border-[var(--sidebar-border)] px-3 sm:px-4">
      <Link
        href="/"
        className={`flex w-full items-center overflow-hidden ${collapsed ? "h-9 justify-center" : "gap-3"}`}
        title={collapsed ? "YUCG Analytics" : undefined}
      >
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface)]">
          <img
            src={logoSrc}
            alt={logoAlt}
            className={`h-7 w-7 object-contain object-center transition-transform duration-200 ease-out ${
              collapsed ? "scale-90" : "scale-100"
            }`}
          />
        </span>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-text-primary">
              {brandLabel}
            </p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-text-tertiary">
              Workspace
            </p>
          </div>
        )}
      </Link>
    </div>
  );
}

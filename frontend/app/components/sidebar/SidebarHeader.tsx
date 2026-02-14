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
  brandLabel = "YUCG ANALYTICS",
}: SidebarHeaderProps) {
  return (
    <div className="flex h-14 items-center border-b border-[var(--sidebar-border)] px-3">
      <Link
        href="/"
        className={`flex items-center overflow-hidden ${collapsed ? "h-8 w-8 justify-center" : "gap-3"}`}
        title={collapsed ? "YUCG Analytics" : undefined}
      >
        <span className="relative flex h-12 w-12 shrink-0 items-center justify-center">
          <img
            src={logoSrc}
            alt={logoAlt}
            className={`h-full w-full object-contain object-center transition-transform duration-200 ease-out ${
              collapsed ? "scale-[0.667]" : "scale-100"
            }`}
          />
        </span>
        {!collapsed && (
          <span className="whitespace-nowrap text-blue-800 font-semibold tracking-tight text-accent">
            {brandLabel}
          </span>
        )}
      </Link>
    </div>
  );
}

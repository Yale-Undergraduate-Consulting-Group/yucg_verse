"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

export interface SidebarNavItem {
  icon: LucideIcon;
  label: string;
  href: string;
}

export interface SidebarNavProps {
  collapsed: boolean;
  items: SidebarNavItem[];
}

export default function SidebarNav({ collapsed, items }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 px-2 py-4">
      <ul className="space-y-0.5">
        {items.map((item) => {
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
  );
}

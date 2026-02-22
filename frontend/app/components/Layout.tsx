"use client";

import TopNavbar from "./TopNavbar";
import { Sidebar } from "./sidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-[var(--app-bg)]">
      <div className="flex h-full w-full overflow-hidden border border-[var(--panel-border)] bg-[var(--panel-bg)]">
        <Sidebar />
        <main className="relative flex min-w-0 flex-1 flex-col bg-[var(--content-bg)]">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_55%_at_50%_-20%,var(--accent-subtle),transparent_72%)]"
            aria-hidden
          />
          <TopNavbar />
          <div className="relative min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

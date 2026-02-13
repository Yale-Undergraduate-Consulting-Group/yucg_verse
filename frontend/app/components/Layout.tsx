"use client";

import Sidebar from "./Sidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="relative flex-1 min-w-0 overflow-hidden">
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,var(--accent-subtle),transparent)] pointer-events-none"
          aria-hidden
        />
        <div className="relative h-full">{children}</div>
      </main>
    </div>
  );
}

"use client";

import Sidebar from "./Sidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-screen flex overflow-hidden">
      <Sidebar />
      <main className="flex-1 h-full overflow-hidden bg-background">
        {children}
      </main>
    </div>
  );
}

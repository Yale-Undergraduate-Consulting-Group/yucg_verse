"use client";

import { Bell, Mail, Search } from "lucide-react";

export default function TopNavbar() {
  return (
    <header className="h-[72px] border-b border-[var(--panel-border)] bg-[var(--panel-bg)]/90 px-4 backdrop-blur sm:px-6">
      <div className="flex h-full items-center gap-3 sm:gap-4">
        <label className="group flex min-w-0 flex-1 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 transition-colors focus-within:border-accent/40 focus-within:bg-white sm:gap-3 sm:px-4">
          <Search className="h-4 w-4 shrink-0 text-text-tertiary group-focus-within:text-accent" />
          <input
            type="text"
            placeholder="Search tools and transcripts..."
            className="w-full min-w-0 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-tertiary"
            aria-label="Search"
          />
        </label>

        <button
          type="button"
          className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--panel-bg)] text-text-secondary transition-colors hover:text-text-primary sm:flex"
          aria-label="Messages"
        >
          <Mail className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--panel-bg)] text-text-secondary transition-colors hover:text-text-primary sm:flex"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>

        <div className="flex shrink-0 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel-bg)] py-1.5 pl-1.5 pr-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface)] text-xs font-semibold text-text-primary">
            JP
          </span>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold leading-none text-text-primary">Jeet Parikh</p>
            <p className="mt-0.5 text-[11px] leading-none text-text-tertiary">YUCG Team</p>
          </div>
        </div>
      </div>
    </header>
  );
}

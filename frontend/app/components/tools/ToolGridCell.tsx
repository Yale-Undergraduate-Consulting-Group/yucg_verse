import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ToolConfig } from "@/app/lib/types";

export type ToolGridCellProps = ToolConfig;

export default function ToolGridCell({
  name,
  description,
  href,
  icon: Icon,
  comingSoon,
}: ToolGridCellProps) {
  const inner = (
    <>
      {comingSoon && (
        <div className="absolute inset-0 bg-[var(--panel-bg)]/60 backdrop-blur-[1px] rounded-2xl" />
      )}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/7 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div
        className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 transition-all duration-300 ${comingSoon ? "bg-[var(--panel-border)] text-text-tertiary ring-[var(--panel-border)]" : "bg-accent-muted text-accent ring-accent/20 group-hover:bg-accent-muted-strong group-hover:ring-accent/40"}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="relative min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3
            className={`font-semibold transition-colors duration-200 ${comingSoon ? "text-text-tertiary" : "text-text-primary group-hover:text-accent"}`}
          >
            {name}
          </h3>
          {comingSoon && (
            <span className="inline-flex items-center rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
              Coming Soon
            </span>
          )}
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
          {description}
        </p>
      </div>
      {!comingSoon && (
        <ArrowRight className="relative mt-1 h-5 w-5 shrink-0 text-text-tertiary transition-all duration-300 group-hover:translate-x-1 group-hover:text-accent" />
      )}
    </>
  );

  if (comingSoon) {
    return (
      <div className="group relative flex items-start gap-4 overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5 shadow-[var(--shadow-sm)] cursor-not-allowed opacity-70">
        {inner}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="group relative flex items-start gap-4 overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5 shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-[var(--shadow-md)]"
    >
      {inner}
    </Link>
  );
}

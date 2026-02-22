import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ToolConfig } from "@/app/lib/types";

type ToolGridCellProps = ToolConfig;

export default function ToolGridCell({
  name,
  description,
  href,
  icon: Icon,
}: ToolGridCellProps) {
  return (
    <Link
      href={href}
      className="group relative flex items-start gap-4 overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5 shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-[var(--shadow-md)]"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-accent/7 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-muted text-accent ring-1 ring-accent/20 transition-all duration-300 group-hover:bg-accent-muted-strong group-hover:ring-accent/40">
        <Icon className="h-5 w-5" />
      </div>
      <div className="relative min-w-0 flex-1">
        <h3 className="font-semibold text-text-primary transition-colors duration-200 group-hover:text-accent">
          {name}
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
          {description}
        </p>
      </div>
      <ArrowRight className="relative mt-1 h-5 w-5 shrink-0 text-text-tertiary transition-all duration-300 group-hover:translate-x-1 group-hover:text-accent" />
    </Link>
  );
}

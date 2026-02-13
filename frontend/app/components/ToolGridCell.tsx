import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

export interface ToolGridCellProps {
  name: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

export default function ToolGridCell({ name, description, href, icon: Icon }: ToolGridCellProps) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 rounded-xl border border-border bg-background-alt p-5 shadow-[var(--shadow-sm)] transition-all hover:border-accent/40 hover:shadow-[var(--shadow-md)] hover:bg-surface"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent-muted-strong text-accent transition-colors group-hover:bg-accent-muted">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-text-primary transition-colors group-hover:text-accent">
          {name}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-text-secondary">
          {description}
        </p>
      </div>
      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-text-tertiary transition-all group-hover:translate-x-0.5 group-hover:text-accent" />
    </Link>
  );
}

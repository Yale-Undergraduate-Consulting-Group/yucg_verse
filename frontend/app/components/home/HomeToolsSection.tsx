import { ToolGrid } from "@/app/components/tools";
import type { ToolConfig } from "@/app/lib/types";

interface HomeToolsSectionProps {
  tools: ToolConfig[];
}

export default function HomeToolsSection({ tools }: HomeToolsSectionProps) {
  return (
    <section className="rounded-3xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5 sm:p-6">
      <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-text-tertiary [font-family:var(--font-plus-jakarta)]">
        Tools
      </h2>
      <ToolGrid tools={tools} />
    </section>
  );
}

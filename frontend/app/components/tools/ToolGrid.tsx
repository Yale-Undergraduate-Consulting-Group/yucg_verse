import { Sparkles } from "lucide-react";
import type { ToolConfig } from "@/app/lib/types";
import ToolGridCell from "./ToolGridCell";

export interface ToolGridProps {
  tools: ToolConfig[];
}

export default function ToolGrid({ tools }: ToolGridProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {tools.map((tool) => (
          <ToolGridCell
            key={tool.href}
            name={tool.name}
            description={tool.description}
            href={tool.href}
            icon={tool.icon}
          />
        ))}
      </div>

      <div className="flex items-center gap-4 rounded-2xl border border-dashed border-[var(--border)] bg-white/40 py-4 pl-4 pr-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-muted text-accent ring-1 ring-accent/25">
          <Sparkles className="h-5 w-5" />
        </span>
        <p className="text-sm text-text-secondary">
          <span className="font-semibold text-text-primary">
            New tools in development.
          </span>{" "}
          More analytics and insights are on the way.
        </p>
      </div>
    </div>
  );
}

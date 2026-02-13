import { Sparkles } from "lucide-react";
import ToolGridCell, { type ToolGridCellProps } from "./ToolGridCell";

export interface ToolGridProps {
  tools: ToolGridCellProps[];
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

      <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-accent-muted/50 px-4 py-3 text-sm text-text-secondary">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-muted text-accent">
          <Sparkles className="h-4 w-4" />
        </span>
        <p>
          <span className="font-medium text-text-primary">New tools in development.</span>{" "}
          More analytics and insights are on the way.
        </p>
      </div>
    </div>
  );
}

import { BarChart3 } from "lucide-react";
import ToolGrid from "./components/ToolGrid";

const tools = [
  {
    name: "Sentiment Analyzer",
    description: "Analyze interview transcripts to extract sentiment insights and patterns.",
    href: "/sentiment-analyzer",
    icon: BarChart3,
  },
];

export default function HomePage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-[var(--content-default)] px-6 py-10 sm:px-8 sm:py-12">
        {/* Hero / Header — constrained, left-aligned */}
        <header className="mb-12 sm:mb-16">
          <p className="text-xs font-medium uppercase tracking-widest text-accent mb-3">
            Yale Undergraduate Consulting Group
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
            Analytics
          </h1>
          <p className="mt-4 max-w-xl text-base text-text-secondary sm:text-lg">
            Internal tools for interview analysis, metrics, and insights.
          </p>
        </header>

        {/* Tools — two per row */}
        <section>
          <h2 className="text-xs font-medium uppercase tracking-wider text-text-tertiary mb-4">
            Tools
          </h2>
          <ToolGrid tools={tools} />
        </section>
      </div>
    </div>
  );
}

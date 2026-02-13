import Link from "next/link";
import { BarChart3, ArrowRight } from "lucide-react";

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
    <div className="h-full flex flex-col p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-primary">
          Welcome to YUCG Analytics
        </h1>
        <p className="text-text-secondary mt-2 max-w-xl">
          Internal analytics tools for the Yale Undergraduate Consulting Group.
          Analyze interviews, track metrics, and gain insights.
        </p>
      </div>

      {/* Tools */}
      <div>
        <h2 className="text-xs font-medium uppercase tracking-wide text-text-tertiary mb-4">
          Tools
        </h2>
        <div className="space-y-2">
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group flex items-center gap-4 p-4 rounded-lg border border-border hover:border-accent hover:bg-accent-muted/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-accent-muted flex items-center justify-center text-accent">
                <tool.icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-text-primary group-hover:text-accent transition-colors">
                  {tool.name}
                </h3>
                <p className="text-sm text-text-secondary">
                  {tool.description}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-text-tertiary group-hover:text-accent group-hover:translate-x-1 transition-all" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

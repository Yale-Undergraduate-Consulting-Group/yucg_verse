import Sidebar from "./components/Sidebar";
import { BarChart3, ArrowRight } from "lucide-react";
import Link from "next/link";

const tools = [
  {
    name: "Sentiment Analyzer",
    description:
      "Analyze interview transcripts to extract sentiment insights and patterns.",
    href: "/sentiment-analyzer",
    icon: BarChart3,
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <main className="ml-60">
        {/* Header bar */}
        <div className="h-14 px-6 flex items-center border-b border-border">
          <span className="text-text-primary font-medium">Home</span>
        </div>

        {/* Content area */}
        <div className="p-10 max-w-4xl">
          {/* Hero section */}
          <div className="mb-12">
            <h1 className="text-3xl font-semibold text-text-primary mb-4">
              Welcome to YUCG Analytics
            </h1>
            <p className="text-lg text-text-secondary max-w-2xl">
              Internal analytics tools for the Yale Undergraduate Consulting
              Group. Analyze interviews, track metrics, and gain insights to
              improve your consulting practice.
            </p>
          </div>

          {/* Tools section */}
          <div>
            <h2 className="text-sm font-medium uppercase tracking-wide text-text-tertiary mb-4">
              Available Tools
            </h2>
            <div className="grid gap-4">
              {tools.map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="group flex items-center justify-between p-6 bg-surface-elevated border border-border rounded-lg hover:border-accent hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-accent-muted flex items-center justify-center text-accent group-hover:text-accent-hover transition-colors">
                      <tool.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-medium text-text-primary group-hover:text-accent transition-colors">
                        {tool.name}
                      </h3>
                      <p className="text-sm text-text-secondary mt-0.5">
                        {tool.description}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-text-tertiary group-hover:text-accent group-hover:translate-x-1 transition-all" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

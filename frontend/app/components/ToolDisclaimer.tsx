import { Info } from "lucide-react";

interface ToolDisclaimerProps {
  message: string;
}

export default function ToolDisclaimer({ message }: ToolDisclaimerProps) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-200/70 bg-amber-50/60 px-4 py-3 text-sm text-amber-800">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
      <p className="leading-relaxed">{message}</p>
    </div>
  );
}

import { Badge } from "@/components/ui/badge";
import { Search, MapPin, ClipboardCheck, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProgressStatus } from "@shared/schema";

const statusConfig: Record<string, { label: string; icon: typeof Search; color: string }> = {
  researching: { label: "Researching", icon: Search, color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  visited: { label: "Visited", icon: MapPin, color: "bg-amber-500/10 text-amber-600 border-amber-200" },
  audited: { label: "Audited", icon: ClipboardCheck, color: "bg-purple-500/10 text-purple-600 border-purple-200" },
  decision: { label: "Decision", icon: CheckCircle2, color: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
};

interface ProgressStatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

export function ProgressStatusBadge({ status, size = "md" }: ProgressStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.researching;
  const Icon = config.icon;

  return (
    <Badge 
      variant="outline"
      className={cn(
        config.color,
        size === "sm" ? "text-xs px-1.5 py-0 h-5" : "text-xs px-2 py-0.5 h-6",
        "gap-1"
      )}
      data-testid={`badge-progress-${status}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

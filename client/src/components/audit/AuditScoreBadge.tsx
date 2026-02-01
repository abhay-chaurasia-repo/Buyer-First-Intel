import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AuditScore {
  score: number | null;
  grade: string | null;
  completedItems: number;
  totalItems: number;
  hasVerifiedVisit: boolean;
  message: string;
}

interface AuditScoreBadgeProps {
  propertyId: string;
  size?: "sm" | "md" | "lg";
  showDetails?: boolean;
}

const gradeColors: Record<string, string> = {
  A: "bg-emerald-500 text-white",
  B: "bg-green-500 text-white",
  C: "bg-yellow-500 text-white",
  D: "bg-orange-500 text-white",
  F: "bg-red-500 text-white",
};

export function AuditScoreBadge({ propertyId, size = "md", showDetails = false }: AuditScoreBadgeProps) {
  const { data: auditScore, isLoading } = useQuery<AuditScore>({
    queryKey: ["/api/audit-score", propertyId],
    enabled: !!propertyId,
  });

  if (isLoading) {
    return (
      <div className={cn(
        "animate-pulse bg-muted rounded",
        size === "sm" ? "h-5 w-8" : size === "lg" ? "h-10 w-14" : "h-6 w-10"
      )} />
    );
  }

  if (!auditScore?.grade) {
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "font-medium",
          size === "sm" ? "text-xs px-1.5 py-0" : size === "lg" ? "text-base px-3 py-1" : "text-xs px-2 py-0.5"
        )}
        data-testid={`badge-audit-score-${propertyId}`}
      >
        {size === "sm" ? "—" : "No Audit"}
      </Badge>
    );
  }

  const gradeColor = gradeColors[auditScore.grade] || "bg-muted";

  return (
    <div className="flex items-center gap-2">
      <Badge 
        className={cn(
          "font-bold",
          gradeColor,
          size === "sm" ? "text-xs px-1.5 py-0 h-5 min-w-[24px]" : 
          size === "lg" ? "text-lg px-3 py-1 h-10 min-w-[40px]" : 
          "text-sm px-2 py-0.5 h-6 min-w-[28px]",
          "flex items-center justify-center"
        )}
        data-testid={`badge-audit-score-${propertyId}`}
      >
        {auditScore.grade}
      </Badge>
      {showDetails && (
        <span className="text-xs text-muted-foreground">
          {auditScore.message}
          {auditScore.hasVerifiedVisit && " ✓ Visited"}
        </span>
      )}
    </div>
  );
}

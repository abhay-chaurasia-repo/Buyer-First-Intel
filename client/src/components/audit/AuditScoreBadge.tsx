import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CheckCircle } from "lucide-react";

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
  size?: "sm" | "lg";
  showDetails?: boolean;
}

const gradeVariants: Record<string, string> = {
  A: "bg-emerald-600 dark:bg-emerald-500",
  B: "bg-green-600 dark:bg-green-500",
  C: "bg-yellow-600 dark:bg-yellow-500",
  D: "bg-orange-600 dark:bg-orange-500",
  F: "bg-red-600 dark:bg-red-500",
};

export function AuditScoreBadge({ propertyId, size = "sm", showDetails = false }: AuditScoreBadgeProps) {
  const { data: auditScore, isLoading } = useQuery<AuditScore>({
    queryKey: ["/api/audit-score", propertyId],
    enabled: !!propertyId,
  });

  if (isLoading) {
    return <Skeleton className="w-8 h-5 rounded" />;
  }

  if (!auditScore?.grade) {
    return (
      <Badge 
        variant="outline"
        data-testid={`badge-audit-score-${propertyId}`}
      >
        {size === "lg" ? "Not Started" : "—"}
      </Badge>
    );
  }

  const gradeColor = gradeVariants[auditScore.grade] || "";

  return (
    <div className={cn("flex items-center gap-2", size === "lg" && "gap-3")}>
      <Badge 
        className={cn(
          "font-bold text-white",
          gradeColor,
          size === "lg" && "text-lg"
        )}
        data-testid={`badge-audit-score-${propertyId}`}
      >
        {auditScore.grade}
      </Badge>
      {showDetails && (
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-muted-foreground">
            {auditScore.completedItems}/{auditScore.totalItems} items
          </span>
          {auditScore.hasVerifiedVisit && (
            <CheckCircle className="h-4 w-4 text-primary" />
          )}
        </div>
      )}
    </div>
  );
}

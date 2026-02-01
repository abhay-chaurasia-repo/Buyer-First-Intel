import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Flag } from "lucide-react";

interface FlagCountBadgeProps {
  propertyId: string;
}

export function FlagCountBadge({ propertyId }: FlagCountBadgeProps) {
  const { data, isLoading } = useQuery<{ count: number }>({
    queryKey: ["/api/flags", propertyId, "count"],
    enabled: !!propertyId,
  });

  if (isLoading) {
    return <Skeleton className="w-12 h-5 rounded" />;
  }

  const count = data?.count || 0;

  if (count === 0) {
    return null;
  }

  return (
    <Badge 
      variant="outline" 
      className="flex items-center gap-1"
      data-testid={`badge-flag-count-${propertyId}`}
    >
      <Flag className="h-3 w-3" />
      {count}
    </Badge>
  );
}

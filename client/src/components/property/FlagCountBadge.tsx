import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle } from "lucide-react";

interface NoteCountBadgeProps {
  propertyId: string;
}

export function NoteCountBadge({ propertyId }: NoteCountBadgeProps) {
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
      data-testid={`badge-note-count-${propertyId}`}
    >
      <MessageCircle className="h-3 w-3" />
      {count}
    </Badge>
  );
}

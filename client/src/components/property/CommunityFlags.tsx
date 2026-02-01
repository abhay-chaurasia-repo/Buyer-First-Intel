import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Flag, ThumbsUp, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { PropertyFlag } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

interface CommunityFlagsProps {
  propertyId: string;
  onAddFlag?: () => void;
}

const severityConfig = {
  minor: { label: "Minor", className: "bg-yellow-500 dark:bg-yellow-600" },
  moderate: { label: "Moderate", className: "bg-orange-500 dark:bg-orange-600" },
  major: { label: "Major", className: "bg-red-500 dark:bg-red-600" },
};

const categoryLabels: Record<string, string> = {
  structural: "Structural",
  legal: "Legal",
  condition: "Condition",
  neighborhood: "Neighborhood",
  other: "Other",
};

export function CommunityFlags({ propertyId, onAddFlag }: CommunityFlagsProps) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(true);

  const { data: flags, isLoading } = useQuery<PropertyFlag[]>({
    queryKey: ["/api/flags", propertyId],
    enabled: !!propertyId,
  });

  const markHelpful = useMutation({
    mutationFn: async (flagId: string) => {
      return apiRequest("POST", `/api/flags/${flagId}/helpful`, { userId: user?.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flags", propertyId] });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const flagCount = flags?.length || 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Flag className="h-4 w-4" />
            Community Reports
            {flagCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {flagCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onAddFlag}
              data-testid="button-add-flag"
            >
              <Plus className="h-4 w-4 mr-1" />
              Report Issue
            </Button>
            {flagCount > 0 && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setExpanded(!expanded)}
                data-testid="button-toggle-flags"
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {flagCount === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No issues reported yet</p>
            <p className="text-xs mt-1">Be the first to help other buyers</p>
          </div>
        ) : expanded ? (
          <div className="space-y-3">
            {flags?.map((flag) => {
              const severity = severityConfig[flag.severity as keyof typeof severityConfig] || severityConfig.minor;
              return (
                <div
                  key={flag.id}
                  className="border rounded-md p-3 space-y-2"
                  data-testid={`flag-item-${flag.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={cn("text-white text-xs", severity.className)}>
                          {severity.label}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {categoryLabels[flag.category] || flag.category}
                        </Badge>
                      </div>
                      <h4 className="font-medium mt-1.5">{flag.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{flag.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-muted-foreground">
                      {flag.isAnonymous ? "Anonymous" : "A buyer"} • {new Date(flag.createdAt!).toLocaleDateString()}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => markHelpful.mutate(flag.id)}
                      disabled={!user}
                      className="h-7"
                      data-testid={`button-helpful-${flag.id}`}
                    >
                      <ThumbsUp className="h-3.5 w-3.5 mr-1" />
                      Helpful ({flag.helpfulCount || 0})
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {flagCount} issue{flagCount !== 1 ? "s" : ""} reported by other buyers
          </p>
        )}
      </CardContent>
    </Card>
  );
}

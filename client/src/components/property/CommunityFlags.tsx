import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, ThumbsUp, Plus, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { PropertyFlag } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

interface CommunityNotesProps {
  propertyId: string;
  onAddNote?: () => void;
}

const severityConfig: Record<string, { label: string; className: string }> = {
  info: { label: "Info", className: "bg-blue-500 dark:bg-blue-600" },
  note: { label: "Note", className: "bg-yellow-500 dark:bg-yellow-600" },
  concern: { label: "Concern", className: "bg-orange-500 dark:bg-orange-600" },
  // Keep legacy values for existing data
  minor: { label: "Info", className: "bg-blue-500 dark:bg-blue-600" },
  moderate: { label: "Note", className: "bg-yellow-500 dark:bg-yellow-600" },
  major: { label: "Concern", className: "bg-orange-500 dark:bg-orange-600" },
};

const categoryLabels: Record<string, string> = {
  structural: "Structural",
  legal: "Legal",
  condition: "Condition",
  neighborhood: "Neighborhood",
  other: "Other",
};

export function CommunityNotes({ propertyId, onAddNote }: CommunityNotesProps) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(true);

  const { data: notes, isLoading } = useQuery<PropertyFlag[]>({
    queryKey: ["/api/flags", propertyId],
    enabled: !!propertyId,
  });

  const markHelpful = useMutation({
    mutationFn: async (noteId: string) => {
      return apiRequest("POST", `/api/flags/${noteId}/helpful`, { userId: user?.id });
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

  const noteCount = notes?.length || 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Buyer Insights
            {noteCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {noteCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onAddNote}
              data-testid="button-add-note"
            >
              <Plus className="h-4 w-4 mr-1" />
              Share Insight
            </Button>
            {noteCount > 0 && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setExpanded(!expanded)}
                data-testid="button-toggle-notes"
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {noteCount === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No buyer insights yet</p>
            <p className="text-xs mt-1">Be the first to share what you found</p>
          </div>
        ) : expanded ? (
          <div className="space-y-3">
            {notes?.map((note) => {
              const severity = severityConfig[note.severity] || severityConfig.info;
              return (
                <div
                  key={note.id}
                  className="border rounded-md p-3 space-y-2"
                  data-testid={`note-item-${note.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={cn("text-white text-xs", severity.className)}>
                          {severity.label}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {categoryLabels[note.category] || note.category}
                        </Badge>
                        {note.contributorHasVisited && (
                          <Badge variant="secondary" className="text-xs flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Visited
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-medium mt-1.5">{note.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{note.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-muted-foreground">
                      {note.isAnonymous ? "Anonymous buyer" : "A buyer"} • {new Date(note.createdAt!).toLocaleDateString()}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => markHelpful.mutate(note.id)}
                      disabled={!user}
                      className="h-7"
                      data-testid={`button-helpful-${note.id}`}
                    >
                      <ThumbsUp className="h-3.5 w-3.5 mr-1" />
                      Helpful ({note.helpfulCount || 0})
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {noteCount} insight{noteCount !== 1 ? "s" : ""} from other buyers
          </p>
        )}
      </CardContent>
    </Card>
  );
}

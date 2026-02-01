import { CheckCircle2, Circle, ChevronDown, ChevronUp, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { ChecklistItem } from "@shared/schema";

interface ChecklistSectionProps {
  title: string;
  items: ChecklistItem[];
  onToggleItem: (itemId: string) => void;
  onUpdateNotes: (itemId: string, notes: string) => void;
}

export function ChecklistSection({ 
  title, 
  items, 
  onToggleItem, 
  onUpdateNotes 
}: ChecklistSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedNotes, setExpandedNotes] = useState<string | null>(null);

  const completedCount = items.filter(item => item.isCompleted).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const getCategoryIcon = () => {
    switch (title.toLowerCase()) {
      case "physical audit":
        return "🏠";
      case "legal":
        return "📋";
      case "neighborhood":
        return "🏘️";
      default:
        return "📝";
    }
  };

  return (
    <Card data-testid={`section-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardHeader className="pb-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-left"
          data-testid={`button-toggle-${title.toLowerCase().replace(/\s+/g, "-")}`}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">{getCategoryIcon()}</span>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {completedCount} of {totalCount} completed
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  progress === 100 ? "bg-success" : "bg-primary"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </button>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-2 space-y-1">
          {items.map((item) => (
            <div 
              key={item.id}
              className="border-b border-border last:border-0"
            >
              <div className="flex items-center gap-3 w-full py-3">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onToggleItem(item.id)}
                  onKeyDown={(e) => e.key === 'Enter' && onToggleItem(item.id)}
                  className={cn(
                    "flex items-center gap-3 flex-1 text-left cursor-pointer",
                    "touch-manipulation active:bg-muted/50 rounded-lg transition-colors"
                  )}
                  data-testid={`checkbox-${item.itemKey}`}
                >
                  {item.isCompleted ? (
                    <CheckCircle2 className="h-6 w-6 text-success flex-shrink-0" />
                  ) : (
                    <Circle className="h-6 w-6 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className={cn(
                    "flex-1 text-base",
                    item.isCompleted && "text-muted-foreground line-through"
                  )}>
                    {item.itemLabel}
                  </span>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setExpandedNotes(expandedNotes === item.id ? null : item.id)}
                  className={cn(
                    "h-8 w-8 flex-shrink-0",
                    item.notes && "text-primary"
                  )}
                  data-testid={`button-notes-${item.itemKey}`}
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </div>

              {expandedNotes === item.id && (
                <div className="pb-3 pl-9">
                  <Textarea
                    placeholder="Add notes about this item..."
                    value={item.notes || ""}
                    onChange={(e) => onUpdateNotes(item.id, e.target.value)}
                    className="min-h-[80px] text-sm resize-none"
                    data-testid={`textarea-notes-${item.itemKey}`}
                  />
                </div>
              )}
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}

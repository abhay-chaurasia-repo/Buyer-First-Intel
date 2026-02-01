import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { PropertyVisit } from "@shared/schema";

interface NoteFormProps {
  propertyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NoteForm({ propertyId, open, onOpenChange }: NoteFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [category, setCategory] = useState<string>("");
  const [severity, setSeverity] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);

  // Check if user has visited this property
  const { data: visits } = useQuery<PropertyVisit[]>({
    queryKey: ["/api/visits", propertyId],
    enabled: !!propertyId && !!user,
  });

  const hasVisited = visits && visits.some(v => v.verified);

  const createNote = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/flags", {
        propertyId,
        userId: user?.id,
        category,
        severity,
        title,
        description,
        isAnonymous,
        contributorHasVisited: hasVisited,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flags", propertyId] });
      queryClient.invalidateQueries({ queryKey: ["/api/flags", propertyId, "count"] });
      toast({
        title: "Insight Shared",
        description: "Your insight has been shared with other buyers.",
      });
      resetForm();
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to share insight. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setCategory("");
    setSeverity("");
    setTitle("");
    setDescription("");
    setIsAnonymous(true);
  };

  const isValid = category && severity && title.trim() && description.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share a Buyer Insight</DialogTitle>
          <DialogDescription>
            Help other buyers by sharing what you observed. Your insight will be visible to everyone viewing this property.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {hasVisited && (
            <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm text-green-700 dark:text-green-300">You've visited this property - your insight will be marked as verified</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger data-testid="select-category">
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="structural">Structural</SelectItem>
                <SelectItem value="condition">Condition</SelectItem>
                <SelectItem value="legal">Legal/Permits</SelectItem>
                <SelectItem value="neighborhood">Neighborhood</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="severity">Type</Label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger data-testid="select-severity">
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info - Good to know</SelectItem>
                <SelectItem value="note">Note - Worth checking</SelectItem>
                <SelectItem value="concern">Concern - Needs attention</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief summary of your observation"
              maxLength={100}
              data-testid="input-title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what you observed and where..."
              maxLength={1000}
              rows={4}
              data-testid="textarea-description"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="anonymous">Post Anonymously</Label>
              <p className="text-xs text-muted-foreground">Your identity won't be shown</p>
            </div>
            <Switch
              id="anonymous"
              checked={isAnonymous}
              onCheckedChange={setIsAnonymous}
              data-testid="switch-anonymous"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => createNote.mutate()}
            disabled={!isValid || createNote.isPending}
            data-testid="button-submit-note"
          >
            {createNote.isPending ? "Sharing..." : "Share Insight"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

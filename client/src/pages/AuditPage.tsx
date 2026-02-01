import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { Header } from "@/components/layout/Header";
import { PageContainer } from "@/components/layout/PageContainer";
import { ChecklistSection } from "@/components/audit/ChecklistSection";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  ClipboardCheck, 
  AlertCircle, 
  MapPin, 
  CheckCircle2, 
  Search,
  ChevronDown
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Property, ChecklistItem } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AuditPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const { data: property, isLoading: propertyLoading } = useQuery<Property>({
    queryKey: ["/api/properties", id],
    enabled: !!id,
  });

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: checklist, isLoading: checklistLoading, refetch } = useQuery<ChecklistItem[]>({
    queryKey: ["/api/checklist", id],
    enabled: !!id,
  });

  const updateChecklistItem = useMutation({
    mutationFn: async ({ itemId, updates }: { itemId: string; updates: Partial<ChecklistItem> }) => {
      return apiRequest("PATCH", `/api/checklist/${itemId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checklist", id] });
    },
  });

  const handleToggleItem = (itemId: string) => {
    const item = checklist?.find(i => i.id === itemId);
    if (item) {
      updateChecklistItem.mutate({
        itemId,
        updates: { isCompleted: !item.isCompleted }
      });
    }
  };

  const handleUpdateNotes = (itemId: string, notes: string) => {
    updateChecklistItem.mutate({
      itemId,
      updates: { notes }
    });
  };

  const handlePropertyChange = (propertyId: string) => {
    setLocation(`/audit/${propertyId}`);
  };

  const physicalItems = checklist?.filter(item => item.category === "physical") || [];
  const legalItems = checklist?.filter(item => item.category === "legal") || [];
  const neighborhoodItems = checklist?.filter(item => item.category === "neighborhood") || [];

  const totalItems = checklist?.length || 0;
  const completedItems = checklist?.filter(item => item.isCompleted).length || 0;
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  const isLoading = propertyLoading || checklistLoading;

  if (!id) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="Due Diligence" showBack />
        <PageContainer>
          <div className="space-y-6">
            <div className="text-center py-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-success/10 mb-3">
                <ClipboardCheck className="h-6 w-6 text-success" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                14-Point Audit
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Select a property to start your due diligence checklist
              </p>
            </div>

            {properties && properties.length > 0 ? (
              <div className="space-y-3">
                <Select onValueChange={handlePropertyChange}>
                  <SelectTrigger className="h-14" data-testid="select-property">
                    <SelectValue placeholder="Choose a property..." />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((prop) => (
                      <SelectItem key={prop.id} value={prop.id}>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{prop.address}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <Card className="bg-muted/30">
                <CardContent className="py-8 text-center">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-semibold text-foreground mb-1">
                    No Properties Yet
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Search for a property first to start your audit
                  </p>
                  <Button onClick={() => setLocation("/search")} data-testid="button-search-first">
                    <Search className="h-4 w-4 mr-2" />
                    Search Properties
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </PageContainer>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="Loading..." showBack />
        <PageContainer>
          <Card>
            <CardContent className="p-4 space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-2 w-full" />
              <div className="space-y-3 pt-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            </CardContent>
          </Card>
        </PageContainer>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="Property Not Found" showBack />
        <PageContainer>
          <Card className="bg-destructive/10">
            <CardContent className="py-8 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-1">
                Property Not Found
              </h3>
              <p className="text-sm text-muted-foreground">
                This property could not be found.
              </p>
            </CardContent>
          </Card>
        </PageContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header title="Due Diligence" showBack />
      <PageContainer>
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">
                    {property.address}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {property.city}, {property.state}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">
                    {completedItems} / {totalItems} items
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
                {progress === 100 && (
                  <div className="flex items-center gap-2 text-success text-sm pt-1">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-medium">Audit Complete!</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {physicalItems.length > 0 && (
              <ChecklistSection
                title="Physical Audit"
                items={physicalItems}
                onToggleItem={handleToggleItem}
                onUpdateNotes={handleUpdateNotes}
              />
            )}

            {legalItems.length > 0 && (
              <ChecklistSection
                title="Legal"
                items={legalItems}
                onToggleItem={handleToggleItem}
                onUpdateNotes={handleUpdateNotes}
              />
            )}

            {neighborhoodItems.length > 0 && (
              <ChecklistSection
                title="Neighborhood"
                items={neighborhoodItems}
                onToggleItem={handleToggleItem}
                onUpdateNotes={handleUpdateNotes}
              />
            )}
          </div>
        </div>
      </PageContainer>
    </div>
  );
}

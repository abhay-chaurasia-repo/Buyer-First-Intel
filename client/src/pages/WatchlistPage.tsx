import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Header } from "@/components/layout/Header";
import { PageContainer } from "@/components/layout/PageContainer";
import { NoteCountBadge } from "@/components/property/FlagCountBadge";
import { NoteForm } from "@/components/property/FlagForm";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Search, MapPin, Bed, Bath, Square, ChevronRight, MessageCircle, CheckCircle2 } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Property, WatchlistItem } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WatchlistWithProperty extends WatchlistItem {
  property: Property;
}

export default function WatchlistPage() {
  const [, setLocation] = useLocation();
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  const { data: watchlist, isLoading } = useQuery<WatchlistWithProperty[]>({
    queryKey: ["/api/watchlist"],
  });

  const removeFromWatchlist = useMutation({
    mutationFn: async (propertyId: string) => {
      return apiRequest("DELETE", `/api/watchlist/${propertyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist/ids"] });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ propertyId, status }: { propertyId: string; status: string }) => {
      return apiRequest("PATCH", `/api/watchlist/${propertyId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
    },
  });

  const handleSelectProperty = (propertyId: string) => {
    setLocation(`/property/${propertyId}`);
  };

  const handleShareInsight = (propertyId: string) => {
    setSelectedPropertyId(propertyId);
    setShowNoteForm(true);
  };

  // Filter for properties that have been visited and might benefit from sharing insights
  const visitedProperties = watchlist?.filter(item => item.status === "visited") || [];

  return (
    <div className="min-h-screen bg-background">
      <Header title="My Watchlist" showBack />
      <PageContainer>
        <div className="space-y-6">
          <div className="text-center py-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-warning/10 mb-3">
              <Star className="h-6 w-6 text-warning" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              Saved Properties
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Track properties you're interested in
            </p>
          </div>

          {/* Visit Reminder Banner */}
          {visitedProperties.length > 0 && (
            <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                      You've visited {visitedProperties.length} {visitedProperties.length === 1 ? "property" : "properties"}!
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                      Share what you observed to help other buyers and add credibility to your insights.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {visitedProperties.slice(0, 2).map((item) => (
                        <Button
                          key={item.id}
                          size="sm"
                          variant="outline"
                          className="bg-white dark:bg-blue-900 border-blue-300 dark:border-blue-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShareInsight(item.propertyId);
                          }}
                          data-testid={`button-share-insight-${item.propertyId}`}
                        >
                          <MessageCircle className="h-3.5 w-3.5 mr-1" />
                          Share about {item.property.address.split(",")[0]}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2 mb-3" />
                    <div className="flex gap-4">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {watchlist && watchlist.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground px-1">
                {watchlist.length} saved {watchlist.length === 1 ? "property" : "properties"}
              </p>
              {watchlist.map((item) => (
                <Card 
                  key={item.id}
                  className="hover-elevate cursor-pointer transition-all"
                  onClick={() => handleSelectProperty(item.propertyId)}
                  data-testid={`card-watchlist-${item.propertyId}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                          <h3 className="font-semibold text-foreground truncate">
                            {item.property.address}
                          </h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {item.property.city}, {item.property.state} {item.property.zipCode}
                        </p>
                        
                        <div className="flex flex-wrap gap-3 mb-3">
                          {item.property.bedrooms && (
                            <div className="flex items-center gap-1 text-sm">
                              <Bed className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="font-medium">{item.property.bedrooms}</span>
                              <span className="text-muted-foreground text-xs">bd</span>
                            </div>
                          )}
                          {item.property.bathrooms && (
                            <div className="flex items-center gap-1 text-sm">
                              <Bath className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="font-medium">{item.property.bathrooms}</span>
                              <span className="text-muted-foreground text-xs">ba</span>
                            </div>
                          )}
                          {item.property.sqft && (
                            <div className="flex items-center gap-1 text-sm">
                              <Square className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="font-medium">{item.property.sqft.toLocaleString()}</span>
                              <span className="text-muted-foreground text-xs">sqft</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <Select
                            value={item.status || "researching"}
                            onValueChange={(value) => {
                              updateStatus.mutate({ propertyId: item.propertyId, status: value });
                            }}
                          >
                            <SelectTrigger 
                              className="w-[130px]"
                              onClick={(e) => e.stopPropagation()}
                              data-testid={`select-status-${item.propertyId}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="researching">Researching</SelectItem>
                              <SelectItem value="visited">Visited</SelectItem>
                              <SelectItem value="audited">Audited</SelectItem>
                              <SelectItem value="decision">Decision</SelectItem>
                            </SelectContent>
                          </Select>
                          <NoteCountBadge propertyId={item.propertyId} />
                          {item.status === "visited" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShareInsight(item.propertyId);
                              }}
                              data-testid={`button-quick-share-${item.propertyId}`}
                            >
                              <MessageCircle className="h-3.5 w-3.5 mr-1" />
                              Share
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromWatchlist.mutate(item.propertyId);
                          }}
                          className="text-warning"
                          data-testid={`button-remove-watchlist-${item.propertyId}`}
                        >
                          <Star className="h-5 w-5 fill-current" />
                        </Button>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!isLoading && (!watchlist || watchlist.length === 0) && (
            <Card className="bg-muted/30">
              <CardContent className="py-8 text-center">
                <Star className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-1">
                  No Saved Properties
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Search for properties and tap the star to save them here
                </p>
                <Button 
                  onClick={() => setLocation("/search")}
                  data-testid="button-go-to-search"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Start Searching
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </PageContainer>

      {/* Note Form Dialog */}
      {selectedPropertyId && (
        <NoteForm
          propertyId={selectedPropertyId}
          open={showNoteForm}
          onOpenChange={(open) => {
            setShowNoteForm(open);
            if (!open) setSelectedPropertyId(null);
          }}
        />
      )}
    </div>
  );
}

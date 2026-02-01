import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Header } from "@/components/layout/Header";
import { PageContainer } from "@/components/layout/PageContainer";
import { PropertyCard } from "@/components/property/PropertyCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Search, Trash2 } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Property, WatchlistItem } from "@shared/schema";

interface WatchlistWithProperty extends WatchlistItem {
  property: Property;
}

export default function WatchlistPage() {
  const [, setLocation] = useLocation();

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

  const handleSelectProperty = (propertyId: string) => {
    setLocation(`/property/${propertyId}`);
  };

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
                <PropertyCard
                  key={item.id}
                  property={item.property}
                  isWatchlisted={true}
                  onToggleWatchlist={() => removeFromWatchlist.mutate(item.propertyId)}
                  onSelect={() => handleSelectProperty(item.propertyId)}
                />
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
    </div>
  );
}

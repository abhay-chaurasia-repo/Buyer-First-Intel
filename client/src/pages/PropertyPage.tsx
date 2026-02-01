import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Header } from "@/components/layout/Header";
import { PageContainer } from "@/components/layout/PageContainer";
import { PropertyFactSheet } from "@/components/property/PropertyFactSheet";
import { GPSVerification } from "@/components/gps/GPSVerification";
import { CommunityNotes } from "@/components/property/CommunityFlags";
import { NoteForm } from "@/components/property/FlagForm";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Star, ClipboardCheck, MapPin, AlertCircle, Calendar, Users } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Property } from "@shared/schema";
import { cn } from "@/lib/utils";

export default function PropertyPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showVisitPrompt, setShowVisitPrompt] = useState(false);
  const [hasSeenPrompt, setHasSeenPrompt] = useState(false);

  const { data: property, isLoading, error } = useQuery<Property>({
    queryKey: ["/api/properties", id],
  });

  const { data: watchlistIds } = useQuery<string[]>({
    queryKey: ["/api/watchlist/ids"],
  });

  const { data: visitCountData } = useQuery<{ count: number }>({
    queryKey: ["/api/visits", id, "count"],
    enabled: !!id,
  });

  const isWatchlisted = watchlistIds?.includes(id || "");

  // Show visit prompt when viewing a property not on watchlist
  useEffect(() => {
    if (property && !isWatchlisted && !hasSeenPrompt && watchlistIds !== undefined) {
      const timer = setTimeout(() => {
        setShowVisitPrompt(true);
        setHasSeenPrompt(true);
      }, 2000); // Show after 2 seconds of viewing
      return () => clearTimeout(timer);
    }
  }, [property, isWatchlisted, hasSeenPrompt, watchlistIds]);

  const addToWatchlist = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/watchlist", { propertyId: id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist/ids"] });
    },
  });

  const removeFromWatchlist = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/watchlist/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist/ids"] });
    },
  });

  const recordVisit = useMutation({
    mutationFn: async (coords: { latitude: number; longitude: number; distance: number }) => {
      return apiRequest("POST", "/api/visits", {
        propertyId: id,
        latitude: coords.latitude.toString(),
        longitude: coords.longitude.toString(),
        distanceMeters: coords.distance,
        verified: coords.distance <= 100,
      });
    },
  });

  const handleToggleWatchlist = () => {
    if (isWatchlisted) {
      removeFromWatchlist.mutate();
    } else {
      addToWatchlist.mutate();
    }
  };

  const handlePlanVisit = () => {
    addToWatchlist.mutate();
    setShowVisitPrompt(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="Loading..." showBack />
        <PageContainer>
          <Card>
            <CardContent className="p-4 space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="space-y-3 pt-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </CardContent>
          </Card>
        </PageContainer>
      </div>
    );
  }

  if (error || !property) {
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
                This property could not be found or has been removed.
              </p>
            </CardContent>
          </Card>
        </PageContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header 
        title="Property Details" 
        showBack 
        rightElement={
          <Button
            size="icon"
            variant="ghost"
            onClick={handleToggleWatchlist}
            className={cn(isWatchlisted && "text-warning")}
            data-testid="button-toggle-watchlist"
          >
            <Star className={cn("h-5 w-5", isWatchlisted && "fill-current")} />
          </Button>
        }
      />
      <PageContainer>
        <div className="space-y-4">
          {visitCountData && visitCountData.count > 0 && (
            <div 
              className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-md text-sm"
              data-testid="visit-count-badge"
            >
              <Users className="h-4 w-4 text-primary" />
              <span className="text-foreground">
                <strong>{visitCountData.count}</strong> {visitCountData.count === 1 ? 'buyer has' : 'buyers have'} verified visits to this property
              </span>
            </div>
          )}
          <PropertyFactSheet property={property} />

          <CommunityNotes 
            propertyId={property.id} 
            onAddNote={() => setShowNoteForm(true)} 
          />

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-14 flex-col gap-1"
              onClick={() => setLocation(`/audit/${property.id}`)}
              data-testid="button-start-audit"
            >
              <ClipboardCheck className="h-5 w-5" />
              <span className="text-xs">Start Audit</span>
            </Button>
            <Button
              variant="outline"
              className="h-14 flex-col gap-1"
              onClick={() => setLocation(`/verify/${property.id}`)}
              data-testid="button-verify-visit"
            >
              <MapPin className="h-5 w-5" />
              <span className="text-xs">Verify Visit</span>
            </Button>
          </div>

          <GPSVerification 
            property={property} 
            onVerify={(coords) => recordVisit.mutate(coords)}
          />
        </div>
      </PageContainer>

      <NoteForm 
        propertyId={property.id}
        open={showNoteForm}
        onOpenChange={setShowNoteForm}
      />

      {/* Planning to Visit prompt */}
      <Dialog open={showVisitPrompt} onOpenChange={setShowVisitPrompt}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Planning to Visit?
            </DialogTitle>
            <DialogDescription>
              Add this property to your watchlist to track your visit and get reminders to share your insights after you see it in person.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setShowVisitPrompt(false)}>
              Just Browsing
            </Button>
            <Button onClick={handlePlanVisit} data-testid="button-plan-visit">
              <Star className="h-4 w-4 mr-1" />
              Yes, Add to Watchlist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Header } from "@/components/layout/Header";
import { PageContainer } from "@/components/layout/PageContainer";
import { GPSVerification } from "@/components/gps/GPSVerification";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  AlertCircle, 
  Search, 
  CheckCircle2, 
  Clock,
  Navigation2
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Property, PropertyVisit } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function VerifyPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const { data: property, isLoading: propertyLoading } = useQuery<Property>({
    queryKey: ["/api/properties", id],
    enabled: !!id,
  });

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: visits, isLoading: visitsLoading } = useQuery<PropertyVisit[]>({
    queryKey: ["/api/visits", id],
    enabled: !!id,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", id] });
    },
  });

  const handlePropertyChange = (propertyId: string) => {
    setLocation(`/verify/${propertyId}`);
  };

  const isLoading = propertyLoading || visitsLoading;
  const verifiedVisits = visits?.filter(v => v.verified) || [];
  const hasVerifiedVisit = verifiedVisits.length > 0;

  if (!id) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="Visit Verification" showBack />
        <PageContainer>
          <div className="space-y-6">
            <div className="text-center py-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-warning/10 mb-3">
                <MapPin className="h-6 w-6 text-warning" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                GPS Verification
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Select a property to verify your visit
              </p>
            </div>

            {properties && properties.length > 0 ? (
              <div className="space-y-3">
                <Select onValueChange={handlePropertyChange}>
                  <SelectTrigger className="h-14" data-testid="select-property-verify">
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
                    Search for a property first to verify your visit
                  </p>
                  <Button onClick={() => setLocation("/search")} data-testid="button-search-verify">
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
              <Skeleton className="h-32 w-full" />
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
      <Header title="Visit Verification" showBack />
      <PageContainer>
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground truncate">
                      {property.address}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {property.city}, {property.state}
                    </p>
                  </div>
                </div>
                {hasVerifiedVisit && (
                  <Badge className="bg-success text-success-foreground flex-shrink-0">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Visited
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <GPSVerification 
            property={property}
            onVerify={(coords) => recordVisit.mutate(coords)}
          />

          {visits && visits.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Visit History
                </h4>
                <div className="space-y-2">
                  {visits.slice(0, 5).map((visit) => (
                    <div 
                      key={visit.id}
                      className="flex items-center justify-between py-2 border-b border-border last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        {visit.verified ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-warning" />
                        )}
                        <span className="text-sm">
                          {visit.visitedAt 
                            ? new Date(visit.visitedAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit"
                              })
                            : "Unknown date"
                          }
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {visit.distanceMeters}m away
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </PageContainer>
    </div>
  );
}

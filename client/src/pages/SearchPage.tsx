import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Header } from "@/components/layout/Header";
import { PageContainer } from "@/components/layout/PageContainer";
import { AddressSearch } from "@/components/property/AddressSearch";
import { PropertyCard } from "@/components/property/PropertyCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Search, MapPin } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Property } from "@shared/schema";

interface PlaceDetails {
  formattedAddress: string;
  streetNumber: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: string;
  longitude: string;
}

export default function SearchPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchError, setSearchError] = useState<string | undefined>();

  const { data: properties, isLoading } = useQuery<Property[]>({
    queryKey: [`/api/properties/search/${encodeURIComponent(searchQuery)}`],
    enabled: !!searchQuery,
  });

  const { data: watchlistIds } = useQuery<string[]>({
    queryKey: ["/api/watchlist/ids"],
  });

  const addToWatchlist = useMutation({
    mutationFn: async (propertyId: string) => {
      return apiRequest("POST", "/api/watchlist", { propertyId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist/ids"] });
    },
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

  const createPropertyMutation = useMutation({
    mutationFn: async (details: PlaceDetails) => {
      const streetAddress = details.streetNumber 
        ? `${details.streetNumber} ${details.street}`
        : details.street || details.formattedAddress.split(",")[0];
      
      // First, fetch property details from ATTOM API
      const address1 = streetAddress;
      const address2 = `${details.city}, ${details.state}`;
      
      const attomResponse = await fetch(
        `/api/attom/property?address1=${encodeURIComponent(address1)}&address2=${encodeURIComponent(address2)}`
      );
      const attomData = await attomResponse.json();
      
      // Build property data - use ATTOM data if available, fallback to Google Places
      const propertyData = attomData.success && attomData.property ? {
        address: attomData.property.address || streetAddress,
        city: attomData.property.city || details.city,
        state: attomData.property.state || details.state,
        zipCode: attomData.property.zipCode || details.zipCode,
        sqft: attomData.property.sqft || undefined,
        bedrooms: attomData.property.bedrooms || undefined,
        bathrooms: attomData.property.bathrooms || undefined,
        yearBuilt: attomData.property.yearBuilt || undefined,
        lotSize: attomData.property.lotSize || undefined,
        propertyType: attomData.property.propertyType || undefined,
        latitude: attomData.property.latitude || details.latitude,
        longitude: attomData.property.longitude || details.longitude,
        dataSource: "attom",
      } : {
        address: streetAddress,
        city: details.city,
        state: details.state,
        zipCode: details.zipCode,
        latitude: details.latitude,
        longitude: details.longitude,
        dataSource: "google_places",
      };
      
      return apiRequest("POST", "/api/properties", propertyData);
    },
    onSuccess: async (response) => {
      const property = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      setLocation(`/property/${property.id}`);
    },
    onError: (error) => {
      console.error("Error creating property:", error);
      setSearchError("Failed to create property. Please try again.");
    },
  });

  const handleSearch = async (query: string) => {
    setSearchError(undefined);
    setSearchQuery(query);
  };

  const handlePlaceSelected = (details: PlaceDetails) => {
    createPropertyMutation.mutate(details);
  };

  const handleToggleWatchlist = (propertyId: string) => {
    if (watchlistIds?.includes(propertyId)) {
      removeFromWatchlist.mutate(propertyId);
    } else {
      addToWatchlist.mutate(propertyId);
    }
  };

  const handleSelectProperty = (propertyId: string) => {
    setLocation(`/property/${propertyId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header title="Property Search" showBack />
      <PageContainer>
        <div className="space-y-6">
          <div className="text-center py-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-3">
              <Search className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              Find a Property
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Enter an address to get public records
            </p>
          </div>

          <AddressSearch 
            onSearch={handleSearch}
            onPlaceSelected={handlePlaceSelected}
            isLoading={isLoading || createPropertyMutation.isPending}
            error={searchError}
          />

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

          {properties && properties.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground px-1">
                Found {properties.length} {properties.length === 1 ? "property" : "properties"}
              </p>
              {properties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  isWatchlisted={watchlistIds?.includes(property.id)}
                  onToggleWatchlist={() => handleToggleWatchlist(property.id)}
                  onSelect={() => handleSelectProperty(property.id)}
                />
              ))}
            </div>
          )}

          {searchQuery && !isLoading && (!properties || properties.length === 0) && (
            <Card className="bg-muted/30">
              <CardContent className="py-8 text-center">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-1">
                  No Properties Found
                </h3>
                <p className="text-sm text-muted-foreground">
                  Try a different address or check your spelling
                </p>
              </CardContent>
            </Card>
          )}

          {!searchQuery && (
            <Card className="bg-muted/30">
              <CardContent className="py-8 text-center">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-1">
                  Start Your Search
                </h3>
                <p className="text-sm text-muted-foreground">
                  Enter a property address above to begin
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </PageContainer>
    </div>
  );
}

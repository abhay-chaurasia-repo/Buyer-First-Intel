import { MapPin, Bed, Bath, Square, Calendar, Star, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NoteCountBadge } from "@/components/property/FlagCountBadge";
import type { Property } from "@shared/schema";
import { cn } from "@/lib/utils";

interface PropertyCardProps {
  property: Property;
  isWatchlisted?: boolean;
  onToggleWatchlist?: () => void;
  onSelect?: () => void;
  showDetails?: boolean;
  showNoteCount?: boolean;
}

export function PropertyCard({ 
  property, 
  isWatchlisted, 
  onToggleWatchlist, 
  onSelect,
  showDetails = true,
  showNoteCount = false 
}: PropertyCardProps) {
  return (
    <Card 
      className="hover-elevate cursor-pointer transition-all"
      onClick={onSelect}
      data-testid={`card-property-${property.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
              <h3 className="font-semibold text-foreground truncate">
                {property.address}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {property.city}, {property.state} {property.zipCode}
            </p>

            {showDetails && (
              <div className="flex flex-wrap gap-3">
                {property.bedrooms && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <Bed className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{property.bedrooms}</span>
                    <span className="text-muted-foreground">bd</span>
                  </div>
                )}
                {property.bathrooms && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <Bath className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{property.bathrooms}</span>
                    <span className="text-muted-foreground">ba</span>
                  </div>
                )}
                {property.sqft && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <Square className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{property.sqft.toLocaleString()}</span>
                    <span className="text-muted-foreground">sqft</span>
                  </div>
                )}
                {property.yearBuilt && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{property.yearBuilt}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            {onToggleWatchlist && (
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleWatchlist();
                }}
                className={cn(
                  isWatchlisted && "text-warning"
                )}
                data-testid={`button-watchlist-${property.id}`}
              >
                <Star className={cn("h-5 w-5", isWatchlisted && "fill-current")} />
              </Button>
            )}
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        {(property.propertyType || showNoteCount) && (
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between gap-2">
            {property.propertyType && (
              <Badge variant="secondary" className="text-xs">
                {property.propertyType}
              </Badge>
            )}
            {showNoteCount && (
              <NoteCountBadge propertyId={property.id} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

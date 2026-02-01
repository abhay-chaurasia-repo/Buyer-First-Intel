import { MapPin, Bed, Bath, Square, Calendar, Home, Ruler, Clock, Database } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Property } from "@shared/schema";

interface PropertyFactSheetProps {
  property: Property;
}

interface FactRowProps {
  icon: React.ReactNode;
  label: string;
  value: string | number | null | undefined;
  suffix?: string;
}

function FactRow({ icon, label, value, suffix }: FactRowProps) {
  if (!value) return null;
  
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
        <span className="text-muted-foreground">{label}</span>
      </div>
      <span className="font-semibold text-foreground">
        {typeof value === "number" ? value.toLocaleString() : value}
        {suffix && <span className="text-muted-foreground font-normal ml-1">{suffix}</span>}
      </span>
    </div>
  );
}

export function PropertyFactSheet({ property }: PropertyFactSheetProps) {
  const lastUpdated = property.lastUpdated 
    ? new Date(property.lastUpdated).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      })
    : null;

  return (
    <div className="space-y-4">
      <Card data-testid="card-property-facts">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="truncate">{property.address}</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {property.city}, {property.state} {property.zipCode}
              </p>
            </div>
            {property.propertyType && (
              <Badge variant="secondary">{property.propertyType}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <FactRow 
            icon={<Bed className="h-5 w-5" />}
            label="Bedrooms"
            value={property.bedrooms}
          />
          <FactRow 
            icon={<Bath className="h-5 w-5" />}
            label="Bathrooms"
            value={property.bathrooms}
          />
          <FactRow 
            icon={<Square className="h-5 w-5" />}
            label="Living Area"
            value={property.sqft}
            suffix="sqft"
          />
          <FactRow 
            icon={<Ruler className="h-5 w-5" />}
            label="Lot Size"
            value={property.lotSize}
          />
          <FactRow 
            icon={<Calendar className="h-5 w-5" />}
            label="Year Built"
            value={property.yearBuilt}
          />
          <FactRow 
            icon={<Home className="h-5 w-5" />}
            label="Property Type"
            value={property.propertyType}
          />
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardContent className="py-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Database className="h-4 w-4" />
              <span>Source: {property.dataSource || "Public Records"}</span>
            </div>
            {lastUpdated && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{lastUpdated}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

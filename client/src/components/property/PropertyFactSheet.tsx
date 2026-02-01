import { 
  MapPin, Bed, Bath, Square, Calendar, Home, Ruler, Clock, Database,
  Layers, Car, Flame, Droplets, Thermometer, Building, Eye, FileText, User
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Property } from "@shared/schema";

interface PropertyFactSheetProps {
  property: Property;
}

interface FactRowProps {
  icon: React.ReactNode;
  label: string;
  value: string | number | boolean | null | undefined;
  suffix?: string;
}

function FactRow({ icon, label, value, suffix }: FactRowProps) {
  if (value === null || value === undefined || value === "") return null;
  
  const displayValue = typeof value === "boolean" 
    ? (value ? "Yes" : "No")
    : typeof value === "number" 
      ? value.toLocaleString() 
      : value;
  
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
        <span className="text-muted-foreground">{label}</span>
      </div>
      <span className="font-semibold text-foreground text-right max-w-[50%]">
        {displayValue}
        {suffix && <span className="text-muted-foreground font-normal ml-1">{suffix}</span>}
      </span>
    </div>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {children}
      </CardContent>
    </Card>
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

  const hasRoomDetails = property.bedrooms || property.bathrooms || property.totalRooms || property.sqft;
  const hasBuildingDetails = property.stories || property.basementSqft || property.garageSqft || 
    property.garageType || property.hasFireplace || property.poolType;
  const hasConstructionDetails = property.constructionType || property.roofType || property.condition || property.quality || 
    property.architecturalStyle || property.yearBuilt;
  const hasUtilities = property.heatingType || property.heatingFuel || property.coolingType;
  const hasLotDetails = property.lotSize || property.lotSizeSqft;
  const hasLegalDetails = property.apn || property.subdivision || property.zoning || property.legalDescription;

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
              <Badge variant="secondary" className="flex-shrink-0 text-xs">
                {property.propertyType}
              </Badge>
            )}
          </div>
          {property.ownerOccupied !== null && property.ownerOccupied !== undefined && (
            <div className="flex items-center gap-2 mt-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {property.ownerOccupied ? "Owner Occupied" : "Non-Owner Occupied"}
              </span>
            </div>
          )}
        </CardHeader>
      </Card>

      {hasRoomDetails && (
        <Section title="Size & Rooms">
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
          {property.bathsFull && (
            <FactRow 
              icon={<Bath className="h-5 w-5" />}
              label="Full Baths"
              value={property.bathsFull}
            />
          )}
          {property.bathsHalf && (
            <FactRow 
              icon={<Bath className="h-5 w-5" />}
              label="Half Baths"
              value={property.bathsHalf}
            />
          )}
          <FactRow 
            icon={<Home className="h-5 w-5" />}
            label="Total Rooms"
            value={property.totalRooms}
          />
          <FactRow 
            icon={<Square className="h-5 w-5" />}
            label="Living Area"
            value={property.sqft}
            suffix="sqft"
          />
        </Section>
      )}

      {hasBuildingDetails && (
        <Section title="Building Features">
          <FactRow 
            icon={<Layers className="h-5 w-5" />}
            label="Stories"
            value={property.stories}
          />
          <FactRow 
            icon={<Square className="h-5 w-5" />}
            label="Basement"
            value={property.basementSqft}
            suffix="sqft"
          />
          <FactRow 
            icon={<Car className="h-5 w-5" />}
            label="Garage"
            value={property.garageType || (property.garageSqft ? `${property.garageSqft} sqft` : null)}
          />
          {property.garageSqft && property.garageType && (
            <FactRow 
              icon={<Car className="h-5 w-5" />}
              label="Garage Size"
              value={property.garageSqft}
              suffix="sqft"
            />
          )}
          <FactRow 
            icon={<Flame className="h-5 w-5" />}
            label="Fireplace"
            value={property.hasFireplace ? (property.fireplaceCount ? `Yes (${property.fireplaceCount})` : "Yes") : null}
          />
          <FactRow 
            icon={<Droplets className="h-5 w-5" />}
            label="Pool"
            value={property.poolType && property.poolType !== "NO POOL" ? property.poolType : null}
          />
          <FactRow 
            icon={<Eye className="h-5 w-5" />}
            label="View"
            value={property.viewType && property.viewType !== "VIEW - NONE" ? property.viewType : null}
          />
        </Section>
      )}

      {hasConstructionDetails && (
        <Section title="Construction">
          <FactRow 
            icon={<Calendar className="h-5 w-5" />}
            label="Year Built"
            value={property.yearBuilt}
          />
          {property.yearBuiltEffective && property.yearBuiltEffective !== property.yearBuilt && (
            <FactRow 
              icon={<Calendar className="h-5 w-5" />}
              label="Effective Year"
              value={property.yearBuiltEffective}
            />
          )}
          <FactRow 
            icon={<Building className="h-5 w-5" />}
            label="Construction"
            value={property.constructionType}
          />
          <FactRow 
            icon={<Building className="h-5 w-5" />}
            label="Roof"
            value={property.roofType}
          />
          <FactRow 
            icon={<Home className="h-5 w-5" />}
            label="Style"
            value={property.architecturalStyle && property.architecturalStyle !== "OTHER" 
              ? property.architecturalStyle : null}
          />
          <FactRow 
            icon={<Building className="h-5 w-5" />}
            label="Condition"
            value={property.condition}
          />
          <FactRow 
            icon={<Building className="h-5 w-5" />}
            label="Quality"
            value={property.quality}
          />
        </Section>
      )}

      {hasUtilities && (
        <Section title="Utilities">
          <FactRow 
            icon={<Thermometer className="h-5 w-5" />}
            label="Heating"
            value={property.heatingType}
          />
          <FactRow 
            icon={<Flame className="h-5 w-5" />}
            label="Heating Fuel"
            value={property.heatingFuel}
          />
          <FactRow 
            icon={<Thermometer className="h-5 w-5" />}
            label="Cooling"
            value={property.coolingType}
          />
        </Section>
      )}

      {hasLotDetails && (
        <Section title="Lot Information">
          <FactRow 
            icon={<Ruler className="h-5 w-5" />}
            label="Lot Size"
            value={property.lotSize}
          />
          {property.lotSizeSqft && (
            <FactRow 
              icon={<Ruler className="h-5 w-5" />}
              label="Lot Size"
              value={property.lotSizeSqft}
              suffix="sqft"
            />
          )}
        </Section>
      )}

      {hasLegalDetails && (
        <Section title="Legal & Tax">
          <FactRow 
            icon={<FileText className="h-5 w-5" />}
            label="APN"
            value={property.apn}
          />
          <FactRow 
            icon={<Home className="h-5 w-5" />}
            label="Subdivision"
            value={property.subdivision}
          />
          <FactRow 
            icon={<FileText className="h-5 w-5" />}
            label="Zoning"
            value={property.zoning}
          />
          {property.legalDescription && (
            <div className="py-3 border-b border-border last:border-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <span className="text-muted-foreground">Legal Description</span>
              </div>
              <p className="text-sm text-foreground pl-[52px]">{property.legalDescription}</p>
            </div>
          )}
        </Section>
      )}

      <Card className="bg-muted/30">
        <CardContent className="py-3">
          <div className="flex items-center justify-between text-sm flex-wrap gap-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Database className="h-4 w-4" />
              <span>Source: {property.dataSource === "attom" ? "ATTOM Public Records" : property.dataSource || "Public Records"}</span>
            </div>
            {property.attomId && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>ID: {property.attomId}</span>
              </div>
            )}
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

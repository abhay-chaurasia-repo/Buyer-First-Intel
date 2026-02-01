import { useState, useEffect } from "react";
import { MapPin, CheckCircle2, XCircle, Loader2, Navigation2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Property } from "@shared/schema";

interface GPSVerificationProps {
  property: Property;
  onVerify: (coords: { latitude: number; longitude: number; distance: number }) => void;
}

type VerificationStatus = "idle" | "loading" | "success" | "failed" | "error";

export function GPSVerification({ property, onVerify }: GPSVerificationProps) {
  const [status, setStatus] = useState<VerificationStatus>("idle");
  const [distance, setDistance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const calculateDistance = (
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): number => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const verifyLocation = () => {
    if (!property.latitude || !property.longitude) {
      setError("Property coordinates not available");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setStatus("error");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLon = position.coords.longitude;
        const propLat = parseFloat(property.latitude!);
        const propLon = parseFloat(property.longitude!);

        const dist = calculateDistance(userLat, userLon, propLat, propLon);
        setDistance(Math.round(dist));

        if (dist <= 100) {
          setStatus("success");
          onVerify({ latitude: userLat, longitude: userLon, distance: Math.round(dist) });
        } else {
          setStatus("failed");
        }
      },
      (err) => {
        setError(err.message);
        setStatus("error");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const openDirections = () => {
    if (property.latitude && property.longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${property.latitude},${property.longitude}`;
      window.open(url, "_blank");
    }
  };

  return (
    <Card data-testid="card-gps-verification">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Visit Verification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Verify you're at the property location by checking your GPS coordinates.
          You must be within 100 meters of the property.
        </p>

        <div className={cn(
          "rounded-xl p-6 text-center transition-colors",
          status === "idle" && "bg-muted/50",
          status === "loading" && "bg-primary/10",
          status === "success" && "bg-success/10",
          status === "failed" && "bg-warning/10",
          status === "error" && "bg-destructive/10"
        )}>
          {status === "idle" && (
            <>
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Ready to verify your location</p>
            </>
          )}

          {status === "loading" && (
            <>
              <Loader2 className="h-12 w-12 text-primary mx-auto mb-3 animate-spin" />
              <p className="text-primary font-medium">Getting your location...</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-3" />
              <p className="text-success font-semibold mb-1">Visit Verified!</p>
              <p className="text-sm text-muted-foreground">
                You are {distance}m from the property
              </p>
            </>
          )}

          {status === "failed" && (
            <>
              <XCircle className="h-12 w-12 text-warning mx-auto mb-3" />
              <p className="text-warning font-semibold mb-1">Too Far Away</p>
              <p className="text-sm text-muted-foreground">
                You are {distance}m from the property (must be within 100m)
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
              <p className="text-destructive font-semibold mb-1">Error</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            onClick={verifyLocation}
            disabled={status === "loading"}
            className="flex-1 h-12"
            data-testid="button-verify-location"
          >
            {status === "loading" ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <MapPin className="h-5 w-5 mr-2" />
            )}
            {status === "success" ? "Verify Again" : "Verify Location"}
          </Button>

          <Button
            variant="outline"
            onClick={openDirections}
            className="h-12"
            data-testid="button-get-directions"
          >
            <Navigation2 className="h-5 w-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

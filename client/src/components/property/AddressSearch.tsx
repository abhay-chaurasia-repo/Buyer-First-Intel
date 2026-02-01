import { useState, useEffect, useRef } from "react";
import { Search, MapPin, AlertCircle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PlacePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

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

interface AddressSearchProps {
  onSearch: (query: string) => void;
  onPlaceSelected?: (details: PlaceDetails) => void;
  isLoading?: boolean;
  error?: string;
}

export function AddressSearch({ onSearch, onPlaceSelected, isLoading, error }: AddressSearchProps) {
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isAutocompleteLoading, setIsAutocompleteLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length < 3) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsAutocompleteLoading(true);
      try {
        const response = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json();
          setPredictions(data.predictions || []);
          setShowDropdown(data.predictions?.length > 0);
          setSelectedIndex(-1);
        }
      } catch (err) {
        console.error("Autocomplete error:", err);
      } finally {
        setIsAutocompleteLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  const handleSelectPrediction = async (prediction: PlacePrediction) => {
    setQuery(prediction.description);
    setShowDropdown(false);
    setPredictions([]);

    try {
      const response = await fetch(`/api/places/details/${prediction.placeId}`);
      if (response.ok) {
        const details: PlaceDetails = await response.json();
        if (onPlaceSelected) {
          onPlaceSelected(details);
        } else {
          onSearch(prediction.mainText);
        }
      } else {
        onSearch(prediction.mainText);
      }
    } catch (err) {
      console.error("Error fetching place details:", err);
      onSearch(prediction.mainText);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || predictions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < predictions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSelectPrediction(predictions[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setShowDropdown(false);
      onSearch(query.trim());
    }
  };

  const handleManualEntry = () => {
    if (query.trim()) {
      setShowDropdown(false);
      onSearch(query.trim());
    }
  };

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardContent className="p-0">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative" ref={containerRef}>
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
            <Input
              type="search"
              placeholder="Enter property address..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => predictions.length > 0 && setShowDropdown(true)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              className={cn(
                "h-14 pl-12 pr-12 text-base rounded-xl border-2",
                "focus:border-primary focus:ring-2 focus:ring-primary/20",
                "placeholder:text-muted-foreground/60",
                error && "border-destructive"
              )}
              data-testid="input-address-search"
            />
            {isAutocompleteLoading && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground animate-spin" />
            )}

            {showDropdown && predictions.length > 0 && (
              <div 
                className="absolute top-full left-0 right-0 mt-1 bg-background border-2 border-border rounded-xl shadow-lg z-50 overflow-hidden"
                data-testid="autocomplete-dropdown"
              >
                {predictions.map((prediction, index) => (
                  <button
                    key={prediction.placeId}
                    type="button"
                    onClick={() => handleSelectPrediction(prediction)}
                    className={cn(
                      "w-full px-4 py-3 text-left flex items-start gap-3 transition-colors",
                      "hover:bg-muted/50 active:bg-muted",
                      index === selectedIndex && "bg-muted",
                      index !== predictions.length - 1 && "border-b border-border"
                    )}
                    data-testid={`autocomplete-item-${index}`}
                  >
                    <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {prediction.mainText}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {prediction.secondaryText}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive px-1">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="submit"
              size="lg"
              className="flex-1 h-12 text-base font-semibold rounded-xl"
              disabled={!query.trim() || isLoading}
              data-testid="button-search"
            >
              <Search className="h-5 w-5 mr-2" />
              {isLoading ? "Searching..." : "Search"}
            </Button>
          </div>

          <button
            type="button"
            onClick={handleManualEntry}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
            data-testid="button-manual-entry"
          >
            Can't find address? Enter manually
          </button>
        </form>
      </CardContent>
    </Card>
  );
}

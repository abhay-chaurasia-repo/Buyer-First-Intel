import { useState } from "react";
import { Search, MapPin, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AddressSearchProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  error?: string;
}

export function AddressSearch({ onSearch, isLoading, error }: AddressSearchProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const handleManualEntry = () => {
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardContent className="p-0">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Enter property address..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={cn(
                "h-14 pl-12 pr-4 text-base rounded-xl border-2",
                "focus:border-primary focus:ring-2 focus:ring-primary/20",
                "placeholder:text-muted-foreground/60",
                error && "border-destructive"
              )}
              data-testid="input-address-search"
            />
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

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Search, Star, ClipboardCheck, MapPin, ChevronRight } from "lucide-react";
import { Redirect } from "wouter";

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/20" />
          <div className="h-4 w-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Redirect to="/home" />;
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="lg:w-1/2 bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-8 lg:p-12 flex flex-col justify-between min-h-[50vh] lg:min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(0,0,0,0.1),transparent_50%)]" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Buyer-First Intel</span>
          </div>
        </div>

        <div className="relative z-10 py-8 lg:py-0">
          <h1 className="text-3xl lg:text-5xl font-bold text-white leading-tight mb-4">
            Research Properties
            <br />
            <span className="text-white/90">Like a Pro</span>
          </h1>
          <p className="text-lg text-white/80 max-w-md mb-8">
            Your private audit platform for U.S. home buying. 
            Get facts, verify visits, and track properties—all in one place.
          </p>

          <div className="hidden lg:grid grid-cols-2 gap-4">
            {[
              { icon: Search, label: "Property Search" },
              { icon: ClipboardCheck, label: "14-Point Audit" },
              { icon: MapPin, label: "GPS Verification" },
              { icon: Star, label: "Private Watchlist" },
            ].map((feature) => (
              <div 
                key={feature.label}
                className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-3"
              >
                <feature.icon className="h-5 w-5 text-white/90" />
                <span className="text-sm font-medium text-white/90">{feature.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 hidden lg:block">
          <p className="text-sm text-white/60">
            Buyer-only platform. No MLS data or agent tools.
          </p>
        </div>
      </div>

      <div className="lg:w-1/2 flex flex-col items-center justify-center p-8 lg:p-12 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-3">
              Welcome Back
            </h2>
            <p className="text-muted-foreground">
              Sign in to access your property research dashboard
            </p>
          </div>

          <div className="space-y-4">
            <a href="/api/login" className="block">
              <Button 
                size="lg" 
                className="w-full h-14 text-base font-semibold rounded-xl gap-2"
                data-testid="button-login"
              >
                Continue with Replit
                <ChevronRight className="h-5 w-5" />
              </Button>
            </a>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Supports
                </span>
              </div>
            </div>

            <div className="flex justify-center gap-4 text-muted-foreground text-sm">
              <span className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded bg-muted flex items-center justify-center text-xs font-bold">G</div>
                Google
              </span>
              <span className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded bg-muted flex items-center justify-center text-xs font-bold"></div>
                Apple
              </span>
              <span className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded bg-muted flex items-center justify-center text-xs font-bold">@</div>
                Email
              </span>
            </div>
          </div>

          <div className="lg:hidden grid grid-cols-2 gap-3">
            {[
              { icon: Search, label: "Property Search" },
              { icon: ClipboardCheck, label: "14-Point Audit" },
              { icon: MapPin, label: "GPS Verification" },
              { icon: Star, label: "Private Watchlist" },
            ].map((feature) => (
              <div 
                key={feature.label}
                className="flex items-center gap-2 bg-muted/50 rounded-lg p-3"
              >
                <feature.icon className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">{feature.label}</span>
              </div>
            ))}
          </div>

          <div className="text-center space-y-2">
            <p className="text-xs text-muted-foreground">
              Free to use. Your property research stays private.
            </p>
            <p className="text-xs text-muted-foreground lg:hidden">
              Buyer-only platform. No MLS data or agent tools.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

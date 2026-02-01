import { Link } from "wouter";
import { Search, Star, ClipboardCheck, MapPin, ArrowRight, ShieldCheck } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Search,
    title: "Address Search",
    description: "Look up any property and get public records instantly",
    href: "/search",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: ClipboardCheck,
    title: "Due Diligence",
    description: "14-point checklist to audit every property",
    href: "/audit",
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    icon: MapPin,
    title: "Visit Verification",
    description: "GPS confirm you've visited the property",
    href: "/verify",
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    icon: Star,
    title: "Watchlist",
    description: "Save and track properties you're interested in",
    href: "/watchlist",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PageContainer>
        <div className="space-y-6">
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
              <ShieldCheck className="h-8 w-8 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Buyer-First Intel
            </h2>
            <p className="text-muted-foreground max-w-xs mx-auto">
              Your private property audit platform. Research before you buy.
            </p>
          </div>

          <div className="space-y-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Link key={feature.href} href={feature.href}>
                  <Card 
                    className="hover-elevate cursor-pointer transition-all"
                    data-testid={`card-feature-${feature.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl ${feature.bgColor} flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`h-6 w-6 ${feature.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground">
                            {feature.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {feature.description}
                          </p>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          <div className="pt-4">
            <Link href="/search">
              <Button 
                size="lg" 
                className="w-full h-14 text-base font-semibold rounded-xl"
                data-testid="button-start-search"
              >
                <Search className="h-5 w-5 mr-2" />
                Start Property Search
              </Button>
            </Link>
          </div>

          <p className="text-xs text-center text-muted-foreground pt-2">
            Buyer-only platform. No MLS data or agent tools.
          </p>
        </div>
      </PageContainer>
    </div>
  );
}

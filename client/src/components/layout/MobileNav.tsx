import { Link, useLocation } from "wouter";
import { Search, Star, ClipboardCheck, MapPin, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/home", icon: Home, label: "Home" },
  { href: "/search", icon: Search, label: "Search" },
  { href: "/watchlist", icon: Star, label: "Watchlist" },
  { href: "/audit", icon: ClipboardCheck, label: "Audit" },
  { href: "/verify", icon: MapPin, label: "Visit" },
];

export function MobileNav() {
  const [location] = useLocation();

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-pb"
      data-testid="nav-mobile"
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const isActive = location === item.href || 
            (item.href !== "/home" && location.startsWith(item.href));
          const Icon = item.icon;
          
          return (
            <Link key={item.href} href={item.href}>
              <button
                className={cn(
                  "flex flex-col items-center justify-center min-w-[64px] h-14 rounded-lg transition-colors",
                  "active:scale-95 touch-manipulation",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground"
                )}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <Icon 
                  className={cn(
                    "h-6 w-6 mb-1",
                    isActive && "stroke-[2.5]"
                  )} 
                />
                <span className={cn(
                  "text-xs font-medium",
                  isActive && "font-semibold"
                )}>
                  {item.label}
                </span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

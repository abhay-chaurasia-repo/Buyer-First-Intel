import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MobileNav } from "@/components/layout/MobileNav";
import { useAuth } from "@/hooks/use-auth";
import LandingPage from "@/pages/LandingPage";
import Home from "@/pages/Home";
import SearchPage from "@/pages/SearchPage";
import PropertyPage from "@/pages/PropertyPage";
import WatchlistPage from "@/pages/WatchlistPage";
import AuditPage from "@/pages/AuditPage";
import VerifyPage from "@/pages/VerifyPage";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/home" component={Home} />
      <Route path="/search" component={SearchPage} />
      <Route path="/property/:id" component={PropertyPage} />
      <Route path="/watchlist" component={WatchlistPage} />
      <Route path="/audit" component={AuditPage} />
      <Route path="/audit/:id" component={AuditPage} />
      <Route path="/verify" component={VerifyPage} />
      <Route path="/verify/:id" component={VerifyPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const { isAuthenticated } = useAuth();
  
  return (
    <div className="min-h-screen bg-background">
      <Router />
      {isAuthenticated && <MobileNav />}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthenticatedApp />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

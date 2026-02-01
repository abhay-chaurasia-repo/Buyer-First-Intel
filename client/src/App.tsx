import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MobileNav } from "@/components/layout/MobileNav";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
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
      <Route path="/home">
        <ProtectedRoute><Home /></ProtectedRoute>
      </Route>
      <Route path="/search">
        <ProtectedRoute><SearchPage /></ProtectedRoute>
      </Route>
      <Route path="/property/:id">
        {(params) => <ProtectedRoute><PropertyPage /></ProtectedRoute>}
      </Route>
      <Route path="/watchlist">
        <ProtectedRoute><WatchlistPage /></ProtectedRoute>
      </Route>
      <Route path="/audit">
        <ProtectedRoute><AuditPage /></ProtectedRoute>
      </Route>
      <Route path="/audit/:id">
        {(params) => <ProtectedRoute><AuditPage /></ProtectedRoute>}
      </Route>
      <Route path="/verify">
        <ProtectedRoute><VerifyPage /></ProtectedRoute>
      </Route>
      <Route path="/verify/:id">
        {(params) => <ProtectedRoute><VerifyPage /></ProtectedRoute>}
      </Route>
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

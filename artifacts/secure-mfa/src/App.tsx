import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function AppRoutes() {
  const [location, setLocation] = useLocation();
  const { data: user, isLoading, error } = useGetMe({ 
    query: { retry: false, queryKey: getGetMeQueryKey() } 
  });

  useEffect(() => {
    if (isLoading) return;
    
    // Redirect logic
    const isAuthRoute = location === "/login" || location === "/register";
    const isProtectedRoute = location.startsWith("/dashboard");

    if (user && isAuthRoute) {
      setLocation("/dashboard");
    } else if (error && isProtectedRoute) {
      setLocation("/login");
    }
  }, [user, isLoading, error, location, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/dashboard" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppRoutes />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

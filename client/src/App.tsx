import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import ControlPanel from "@/pages/ControlPanel";
import { WebSocketProvider } from "@/hooks/useWebSocket";
import { ThemeProvider } from "./lib/themeContext"; // Fixed ThemeProvider import

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/control" component={ControlPanel} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <WebSocketProvider>
          <Router />
          <Toaster />
        </WebSocketProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import ManusSidebar from "./components/ManusSidebar";
import ManusHeader from "./components/ManusHeader";
import NewTask from "./pages/NewTask";
import TaskDetail from "./pages/TaskDetail";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";

function AppShell() {
  const [location] = useLocation();
  if (location === "/login") return <Login />;

  return (
    <div className="flex h-screen bg-background text-foreground">
      <ManusSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ManusHeader />
        <div className="flex-1 overflow-auto">
          <Switch>
            <Route path={"/$"} component={Home} />
            <Route path={"/dashboard"} component={Dashboard} />
            <Route path={"/tasks/new"} component={NewTask} />
            <Route path={"/tasks/:taskId"} component={TaskDetail} />
            <Route path={"/profile"} component={Profile} />
            <Route path={"/404"} component={NotFound} />
            <Route component={NotFound} />
          </Switch>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <AppShell />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

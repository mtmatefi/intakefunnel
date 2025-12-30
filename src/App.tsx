import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { Loader2 } from "lucide-react";
import LoginPage from "./pages/Login";
import DashboardPage from "./pages/Dashboard";
import NewIntakePage from "./pages/NewIntake";
import IntakeDetailPage from "./pages/IntakeDetail";
import ArchitectQueuePage from "./pages/ArchitectQueue";
import AuditLogPage from "./pages/AuditLog";
import PoliciesPage from "./pages/admin/Policies";
import IntegrationsPage from "./pages/admin/Integrations";
import InterviewConfigPage from "./pages/admin/InterviewConfig";
import ProfilePage from "./pages/Profile";
import SettingsPage from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />} />
      <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/intake/new" element={<ProtectedRoute><NewIntakePage /></ProtectedRoute>} />
      <Route path="/intake/:id" element={<ProtectedRoute><IntakeDetailPage /></ProtectedRoute>} />
      <Route path="/architect" element={<ProtectedRoute><ArchitectQueuePage /></ProtectedRoute>} />
      <Route path="/audit" element={<ProtectedRoute><AuditLogPage /></ProtectedRoute>} />
      <Route path="/admin/policies" element={<ProtectedRoute><PoliciesPage /></ProtectedRoute>} />
      <Route path="/admin/integrations" element={<ProtectedRoute><IntegrationsPage /></ProtectedRoute>} />
      <Route path="/admin/interview-config" element={<ProtectedRoute><InterviewConfigPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;

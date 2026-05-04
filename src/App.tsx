import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { TutorialProvider } from "./contexts/TutorialContext";
import { WorkspaceProvider, useWorkspace } from "./contexts/WorkspaceContext";
import { TutorialOverlay } from "./components/tutorial/TutorialOverlay";
import { useTutorial } from "./hooks/useTutorial";
import { Loader2 } from "lucide-react";
import LoginPage from "./pages/Login";
import DashboardPage from "./pages/Dashboard";
import NewIntakePage from "./pages/NewIntake";
import IntakeDetailPage from "./pages/IntakeDetail";
import IntakesPage from "./pages/Intakes";
import ArchitectQueuePage from "./pages/ArchitectQueue";
import MetricsPage from "./pages/Metrics";
import AuditLogPage from "./pages/AuditLog";
import PoliciesPage from "./pages/admin/Policies";
import IntegrationsPage from "./pages/admin/Integrations";
import InterviewConfigPage from "./pages/admin/InterviewConfig";
import UserManagementPage from "./pages/admin/UserManagement";
import ProfilePage from "./pages/Profile";
import SettingsPage from "./pages/Settings";
import TutorialsPage from "./pages/Tutorials";
import NotFound from "./pages/NotFound";
import WorkspaceSelect from "./pages/WorkspaceSelect";
import PlatformAdmin from "./pages/PlatformAdmin";
import InnovationsPage from "./pages/Innovations";

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
  const { workspace, loading: wsLoading } = useWorkspace();
  if (isLoading || wsLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  // If no workspace selected, redirect to workspace selector
  if (!workspace) return <Navigate to="/workspace" replace />;
  return <>{children}</>;
}

function WorkspaceRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function GlobalTutorialOverlay() {
  const { overlayTutorial, overlayStepIndex, nextOverlayStep, prevOverlayStep, closeOverlay } = useTutorial();
  if (!overlayTutorial) return null;
  return (
    <TutorialOverlay
      tutorial={overlayTutorial}
      stepIndex={overlayStepIndex}
      onNext={nextOverlayStep}
      onPrev={prevOverlayStep}
      onClose={closeOverlay}
    />
  );
}

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;

  return (
    <>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />} />
        <Route path="/workspace" element={<WorkspaceRoute><WorkspaceSelect /></WorkspaceRoute>} />
        <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/intakes" element={<ProtectedRoute><IntakesPage /></ProtectedRoute>} />
        <Route path="/intake/new" element={<ProtectedRoute><NewIntakePage /></ProtectedRoute>} />
        <Route path="/intake/:id" element={<ProtectedRoute><IntakeDetailPage /></ProtectedRoute>} />
        <Route path="/architect" element={<ProtectedRoute><ArchitectQueuePage /></ProtectedRoute>} />
        <Route path="/metrics" element={<ProtectedRoute><MetricsPage /></ProtectedRoute>} />
        <Route path="/audit" element={<ProtectedRoute><AuditLogPage /></ProtectedRoute>} />
        <Route path="/admin/policies" element={<ProtectedRoute><PoliciesPage /></ProtectedRoute>} />
        <Route path="/admin/integrations" element={<ProtectedRoute><IntegrationsPage /></ProtectedRoute>} />
        <Route path="/admin/interview-config" element={<ProtectedRoute><InterviewConfigPage /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute><UserManagementPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/tutorials" element={<ProtectedRoute><TutorialsPage /></ProtectedRoute>} />
        <Route path="/platform-admin" element={<ProtectedRoute><PlatformAdmin /></ProtectedRoute>} />
        <Route path="/innovations" element={<ProtectedRoute><InnovationsPage /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <GlobalTutorialOverlay />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <WorkspaceProvider>
        <TutorialProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </TutorialProvider>
        </WorkspaceProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;

import React, { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import AppErrorBoundary from "@/components/app/AppErrorBoundary";
import RequireAuth from "@/components/app/RequireAuth";
import RouteLoadingScreen from "@/components/app/RouteLoadingScreen";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { FeatureAccessProvider } from "@/contexts/FeatureAccessContext";
import { ProjectProvider } from "@/contexts/ProjectContext";

const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Login = lazy(() => import("./pages/Auth/Login"));
const Register = lazy(() => import("./pages/Auth/Register"));
const ForgotPassword = lazy(() => import("./pages/Auth/ForgotPassword"));
const SchoolSignup = lazy(() => import("./pages/Auth/SchoolSignup"));
const ContactSales = lazy(() => import("./pages/Auth/ContactSales"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ProjectsPage = lazy(() => import("./pages/Projects/ProjectsPage"));
const NewProject = lazy(() => import("./pages/Projects/NewProject"));
const ProjectView = lazy(() => import("./pages/Projects/ProjectView"));
const ProjectEdit = lazy(() => import("./pages/Projects/ProjectEdit"));
const Premium = lazy(() => import("./pages/Premium"));
const Guidelines = lazy(() => import("./pages/Guidelines"));
const MarkingGuide = lazy(() => import("./pages/MarkingGuide"));
const PlagiarismChecker = lazy(() => import("./pages/PlagiarismChecker"));
const ResearchTopicGenerator = lazy(() => import("./pages/ResearchTopicGenerator"));
const Settings = lazy(() => import("./pages/Settings"));
const DocumentAnalysis = lazy(() => import("./pages/DocumentAnalysis"));
const ContentImprovement = lazy(() => import("./pages/ContentImprovement"));
const Humanizer = lazy(() => import("./pages/Humanizer"));
const GettingStarted = lazy(() => import("./pages/GettingStarted"));
const SchoolDashboard = lazy(() => import("./pages/SchoolDashboard"));
const SchoolStudentWorkspace = lazy(() => import("./pages/SchoolStudentWorkspace"));
const SupervisorDashboard = lazy(() => import("./pages/SupervisorDashboard"));
const SupervisorStudents = lazy(() => import("./pages/SupervisorStudents"));
const SupervisorStudentReview = lazy(() => import("./pages/SupervisorStudentReview"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));

const privateRoute = (element: React.ReactNode) => <RequireAuth>{element}</RequireAuth>;
const researcherRoute = (element: React.ReactNode) => (
  <RequireAuth redirectSchoolAdminTo="/school-dashboard" redirectSupervisorTo="/supervisor-dashboard" redirectStudentTo="/student-workspace">{element}</RequireAuth>
);
const schoolAdminRoute = (element: React.ReactNode) => (
  <RequireAuth schoolAdminOnly>{element}</RequireAuth>
);
const supervisorRoute = (element: React.ReactNode) => (
  <RequireAuth schoolSupervisorOnly>{element}</RequireAuth>
);
const schoolStudentRoute = (element: React.ReactNode) => (
  <RequireAuth schoolStudentOnly>{element}</RequireAuth>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

const AppRoutes = () => (
  <Suspense fallback={<RouteLoadingScreen />}>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/school-signup" element={<SchoolSignup />} />
      <Route path="/contact-sales" element={<ContactSales />} />
      <Route path="/dashboard" element={researcherRoute(<Dashboard />)} />
      <Route path="/getting-started" element={privateRoute(<GettingStarted />)} />
      <Route path="/review-history" element={privateRoute(<Navigate to="/projects?view=archive" replace />)} />
      <Route path="/school-dashboard" element={schoolAdminRoute(<SchoolDashboard />)} />
      <Route path="/student-workspace" element={schoolStudentRoute(<SchoolStudentWorkspace />)} />
      <Route path="/supervisor-dashboard" element={supervisorRoute(<SupervisorDashboard />)} />
      <Route path="/supervisor-students" element={supervisorRoute(<SupervisorStudents />)} />
      <Route path="/supervisor-students/:studentId" element={supervisorRoute(<SupervisorStudentReview />)} />
      <Route path="/projects" element={privateRoute(<ProjectsPage />)} />
      <Route path="/projects/new" element={privateRoute(<NewProject />)} />
      <Route path="/projects/:projectId" element={privateRoute(<ProjectView />)} />
      <Route path="/projects/:projectId/edit" element={privateRoute(<ProjectEdit />)} />
      <Route path="/premium" element={privateRoute(<Premium />)} />
      <Route path="/guidelines" element={privateRoute(<Guidelines />)} />
      <Route path="/marking-guide" element={privateRoute(<MarkingGuide />)} />
      <Route path="/document-analysis" element={privateRoute(<DocumentAnalysis />)} />
      <Route path="/plagiarism-checker" element={privateRoute(<PlagiarismChecker />)} />
      <Route path="/research-topic-generator" element={privateRoute(<ResearchTopicGenerator />)} />
      <Route path="/settings" element={privateRoute(<Settings />)} />
      <Route path="/content-improvement" element={privateRoute(<ContentImprovement />)} />
      <Route path="/humanizer" element={privateRoute(<Humanizer />)} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
);

const App = () => (
  <AppErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AuthProvider>
            <ProjectProvider>
              <FeatureAccessProvider>
                <BrowserRouter>
                  <AppRoutes />
                </BrowserRouter>
              </FeatureAccessProvider>
            </ProjectProvider>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </AppErrorBoundary>
);

export default App;

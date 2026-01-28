import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Syllabus from "./pages/Syllabus";
import LessonPlans from "./pages/LessonPlans";
import QuizGenerator from "./pages/QuizGenerator";
import AIChat from "./pages/AIChat";
import HomeworkHelp from "./pages/HomeworkHelp";
import History from "./pages/History";
import Settings from "./pages/Settings";
import StudentAuth from "./pages/StudentAuth";
import TakeQuiz from "./pages/TakeQuiz";
import QuizSubmissions from "./pages/QuizSubmissions";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Protected route component (for teachers)
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

// Auth route (redirect to dashboard if logged in)
function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/syllabus" element={<ProtectedRoute><Syllabus /></ProtectedRoute>} />
      <Route path="/lesson-plans" element={<ProtectedRoute><LessonPlans /></ProtectedRoute>} />
      <Route path="/quiz" element={<ProtectedRoute><QuizGenerator /></ProtectedRoute>} />
      <Route path="/quiz/submissions/:quizId" element={<ProtectedRoute><QuizSubmissions /></ProtectedRoute>} />
      <Route path="/chat" element={<ProtectedRoute><AIChat /></ProtectedRoute>} />
      <Route path="/homework" element={<ProtectedRoute><HomeworkHelp /></ProtectedRoute>} />
      <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      
      {/* Student Routes */}
      <Route path="/student/auth" element={<StudentAuth />} />
      <Route path="/quiz/take/:shareToken" element={<TakeQuiz />} />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;

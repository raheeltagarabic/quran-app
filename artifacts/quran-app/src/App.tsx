import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@workspace/replit-auth-web";
import { Loader2 } from "lucide-react";

import NotFound from "@/pages/not-found";
import Login from "@/pages/login";

import TeacherStudents from "@/pages/teacher/students";
import TeacherTopics from "@/pages/teacher/topics";
import TeacherTopicDetails from "@/pages/teacher/topic-details";
import TeacherProgress from "@/pages/teacher/progress";
import TeacherRecordings from "@/pages/teacher/recordings";
import TeacherAttendance from "@/pages/teacher/attendance";
import TeacherFees from "@/pages/teacher/fees";
import TeacherTestResults from "@/pages/teacher/test-results";

import StudentToday from "@/pages/student/today";
import StudentTest from "@/pages/student/test";
import ParentDashboard from "@/pages/parent/dashboard";
import StudentProgress from "@/pages/student/progress";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FullPageSpinner() {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

/** Returns the correct home path for a given role. */
function roleHome(role: string | null | undefined): string {
  if (role === "teacher") return "/teacher/students";
  if (role === "parent") return "/parent/dashboard";
  return "/student/today";
}

// ─── Route guard ─────────────────────────────────────────────────────────────

/**
 * Guards a single page. Redirects away if the user's role doesn't match.
 * allowedRole: "teacher" | "student" | "parent"
 */
function RoleGuard({
  component: Component,
  allowedRole,
}: {
  component: React.ComponentType;
  allowedRole: "teacher" | "student" | "parent";
}) {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) return <FullPageSpinner />;
  if (!isAuthenticated) return <Redirect to="/login" />;

  const role = user?.role ?? "student";

  if (role !== allowedRole) {
    return <Redirect to={roleHome(role)} />;
  }

  return <Component />;
}

// ─── Layout shell ─────────────────────────────────────────────────────────────

function AppShell() {
  return (
    <SidebarProvider style={{ "--sidebar-width": "18rem" } as React.CSSProperties}>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex h-16 items-center px-4 border-b border-border/50 bg-background/95 backdrop-blur z-10 shrink-0">
            <SidebarTrigger className="hover-elevate rounded-lg" />
          </header>
          <main className="flex-1 overflow-auto bg-background/50">
            <Switch>
              {/* Teacher routes */}
              <Route path="/teacher/students">
                <RoleGuard component={TeacherStudents} allowedRole="teacher" />
              </Route>
              <Route path="/teacher/topics/:id">
                <RoleGuard component={TeacherTopicDetails} allowedRole="teacher" />
              </Route>
              <Route path="/teacher/topics">
                <RoleGuard component={TeacherTopics} allowedRole="teacher" />
              </Route>
              <Route path="/teacher/progress">
                <RoleGuard component={TeacherProgress} allowedRole="teacher" />
              </Route>
              <Route path="/teacher/recordings">
                <RoleGuard component={TeacherRecordings} allowedRole="teacher" />
              </Route>
              <Route path="/teacher/attendance">
                <RoleGuard component={TeacherAttendance} allowedRole="teacher" />
              </Route>
              <Route path="/teacher/fees">
                <RoleGuard component={TeacherFees} allowedRole="teacher" />
              </Route>
              <Route path="/teacher/test-results">
                <RoleGuard component={TeacherTestResults} allowedRole="teacher" />
              </Route>

              {/* Student routes */}
              <Route path="/student/today">
                <RoleGuard component={StudentToday} allowedRole="student" />
              </Route>
              <Route path="/student/progress">
                <RoleGuard component={StudentProgress} allowedRole="student" />
              </Route>
              <Route path="/student/test">
                <RoleGuard component={StudentTest} allowedRole="student" />
              </Route>

              {/* Parent routes */}
              <Route path="/parent/dashboard">
                <RoleGuard component={ParentDashboard} allowedRole="parent" />
              </Route>

              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

// ─── Top-level auth gate ──────────────────────────────────────────────────────

/**
 * Single component that owns ALL routing decisions based on auth state.
 * Avoids any ambiguous nested-Switch matching issues.
 */
function AuthGate() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [location] = useLocation();

  // While checking auth, show spinner for everything except /login
  if (isLoading) {
    return <FullPageSpinner />;
  }

  // ── Not logged in ────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    // Allow the login page; redirect everything else to /login
    if (location === "/login") return <Login />;
    return <Redirect to="/login" />;
  }

  // ── Logged in ────────────────────────────────────────────────────────────

  // /login while authenticated → go to role home
  if (location === "/login") {
    return <Redirect to={roleHome(user?.role)} />;
  }

  // Root path → go to role home
  if (location === "/" || location === "") {
    return <Redirect to={roleHome(user?.role)} />;
  }

  // All other paths → render the app shell with protected routes
  return <AppShell />;
}

// ─── App ──────────────────────────────────────────────────────────────────────

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthGate />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

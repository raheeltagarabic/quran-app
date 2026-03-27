import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
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

import StudentToday from "@/pages/student/today";
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

function ProtectedRoute({ component: Component, allowedRole }: { component: any, allowedRole?: 'teacher' | 'student' }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return <Redirect to="/login" />;

  const isTeacher = user?.role === "teacher";
  const isParent = user?.role === "parent";

  if (allowedRole === 'teacher' && !isTeacher) {
    return <Redirect to={isParent ? "/parent/dashboard" : "/student/today"} />;
  }
  if (allowedRole === 'student' && (isTeacher || isParent)) {
    return <Redirect to={isTeacher ? "/teacher/students" : "/parent/dashboard"} />;
  }
  if (allowedRole === 'parent' && !isParent) {
    return <Redirect to={isTeacher ? "/teacher/students" : "/student/today"} />;
  }

  return <Component />;
}

function Layout() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <div className="h-screen w-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!isAuthenticated) return <Redirect to="/login" />;

  const style = {
    "--sidebar-width": "18rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={style}>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex h-16 items-center px-4 border-b border-border/50 bg-background/95 backdrop-blur z-10 shrink-0">
            <SidebarTrigger className="hover-elevate rounded-lg" />
          </header>
          <main className="flex-1 overflow-auto bg-background/50">
            <Switch>
              <Route path="/">
                {user?.role === "teacher" ? <Redirect to="/teacher/students" /> : user?.role === "parent" ? <Redirect to="/parent/dashboard" /> : <Redirect to="/student/today" />}
              </Route>
              
              <Route path="/teacher/students"><ProtectedRoute component={TeacherStudents} allowedRole="teacher" /></Route>
              <Route path="/teacher/topics"><ProtectedRoute component={TeacherTopics} allowedRole="teacher" /></Route>
              <Route path="/teacher/topics/:id"><ProtectedRoute component={TeacherTopicDetails} allowedRole="teacher" /></Route>
              <Route path="/teacher/progress"><ProtectedRoute component={TeacherProgress} allowedRole="teacher" /></Route>
              <Route path="/teacher/recordings"><ProtectedRoute component={TeacherRecordings} allowedRole="teacher" /></Route>
              <Route path="/teacher/attendance"><ProtectedRoute component={TeacherAttendance} allowedRole="teacher" /></Route>
              <Route path="/teacher/fees"><ProtectedRoute component={TeacherFees} allowedRole="teacher" /></Route>

              <Route path="/student/today"><ProtectedRoute component={StudentToday} allowedRole="student" /></Route>
              <Route path="/student/progress"><ProtectedRoute component={StudentProgress} allowedRole="student" /></Route>

              <Route path="/parent/dashboard"><ProtectedRoute component={ParentDashboard} allowedRole="parent" /></Route>

              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/.*" component={Layout} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

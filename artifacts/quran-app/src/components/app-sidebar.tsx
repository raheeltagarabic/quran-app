import { BookOpen, Calendar, GraduationCap, LayoutDashboard, LogOut, Mic, Target, Users } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const isTeacher = user?.role === "teacher";

  const teacherItems = [
    { title: "Students", url: "/teacher/students", icon: Users },
    { title: "Topics", url: "/teacher/topics", icon: BookOpen },
    { title: "Progress", url: "/teacher/progress", icon: Target },
    { title: "Recordings", url: "/teacher/recordings", icon: Mic },
  ];

  const studentItems = [
    { title: "Today's Class", url: "/student/today", icon: Calendar },
    { title: "My Progress", url: "/student/progress", icon: Target },
  ];

  const items = isTeacher ? teacherItems : studentItems;

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/25">
            <GraduationCap className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold leading-none text-foreground">Quran Qaida</h2>
            <p className="text-xs text-muted-foreground">{isTeacher ? "Teacher Portal" : "Student Portal"}</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = location.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      data-active={isActive}
                      className="hover-elevate active-elevate-2 font-medium"
                    >
                      <Link href={item.url} className={isActive ? "text-primary" : "text-muted-foreground"}>
                        <item.icon className={isActive ? "text-primary" : ""} />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex flex-col truncate pr-2">
            <span className="text-sm font-semibold text-foreground truncate">
              {user?.firstName} {user?.lastName}
            </span>
            <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
          </div>
          <button 
            onClick={logout}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

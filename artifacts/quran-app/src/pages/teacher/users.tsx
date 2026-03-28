import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@workspace/replit-auth-web";
import { Loader2, ShieldCheck, User, Users } from "lucide-react";

type AppUser = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string | null;
};

type Role = "teacher" | "student" | "parent";

const ROLE_CONFIG: Record<Role, { label: string; variant: "default" | "secondary" | "outline" }> = {
  teacher: { label: "Teacher", variant: "default" },
  parent:  { label: "Parent",  variant: "secondary" },
  student: { label: "Student", variant: "outline" },
};

function RoleBadge({ role }: { role: string | null }) {
  const r = (role ?? "student") as Role;
  const cfg = ROLE_CONFIG[r] ?? ROLE_CONFIG.student;
  const colors: Record<Role, string> = {
    teacher: "bg-green-100 text-green-800 border-green-200",
    parent:  "bg-orange-100 text-orange-800 border-orange-200",
    student: "bg-blue-100 text-blue-800 border-blue-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${colors[r] ?? colors.student}`}
    >
      {cfg.label}
    </span>
  );
}

async function fetchUsers(): Promise<AppUser[]> {
  const res = await fetch("/api/users", { credentials: "include", cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json() as Promise<AppUser[]>;
}

async function promoteUser(body: { email: string; role: Role }) {
  const res = await fetch("/api/users/promote", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = (await res.json()) as { error?: string };
    throw new Error(data.error ?? "Failed to update role");
  }
  return res.json();
}

export default function TeacherUsers() {
  const { user: me } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const { data: users = [], isLoading } = useQuery<AppUser[]>({
    queryKey: ["/api/users"],
    queryFn: fetchUsers,
  });

  const mutation = useMutation({
    mutationFn: promoteUser,
    onSuccess: (_data, vars) => {
      toast({ title: "Role updated", description: `${vars.email} is now a ${vars.role}.` });
      qc.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
    onSettled: () => setPendingId(null),
  });

  function handlePromote(user: AppUser, role: Role) {
    if (!user.email) return;
    setPendingId(`${user.id}-${role}`);
    mutation.mutate({ email: user.email, role });
  }

  const isSelf = (u: AppUser) => u.email === me?.email;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground">Assign roles to users in the system</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">All Users</CardTitle>
          </div>
          <CardDescription>
            Click a role button to reassign a user. You cannot change your own role.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
              <User className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No users found</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {users.map((u) => {
                const self = isSelf(u);
                return (
                  <div
                    key={u.id}
                    className="flex items-center justify-between py-3 gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-foreground truncate">
                          {u.firstName || u.lastName
                            ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()
                            : u.email ?? "—"}
                        </span>
                        <RoleBadge role={u.role} />
                        {self && (
                          <span className="text-xs text-muted-foreground">(you)</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{u.email}</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {(["teacher", "student", "parent"] as Role[]).map((r) => {
                        const isCurrentRole = u.role === r;
                        const key = `${u.id}-${r}`;
                        const loading = pendingId === key && mutation.isPending;
                        return (
                          <Button
                            key={r}
                            size="sm"
                            variant={isCurrentRole ? "default" : "outline"}
                            className="h-7 text-xs px-2"
                            disabled={self || isCurrentRole || mutation.isPending}
                            onClick={() => handlePromote(u, r)}
                          >
                            {loading ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              ROLE_CONFIG[r].label
                            )}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

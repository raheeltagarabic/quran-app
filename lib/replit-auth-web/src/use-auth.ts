import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import type { AuthUser } from "@workspace/api-client-react";

export type { AuthUser };

const AUTH_QUERY_KEY = ["/api/me"];

async function fetchUser(): Promise<AuthUser | null> {
  const res = await fetch("/api/me", { credentials: "include" });
  if (!res.ok) return null;
  const data = (await res.json()) as { user: AuthUser | null };
  return data.user ?? null;
}

export function useAuth() {
  const { data: user = null, isLoading } = useQuery<AuthUser | null>({
    queryKey: AUTH_QUERY_KEY,
    queryFn: fetchUser,
    staleTime: 0,        // Always fetch fresh on mount
    gcTime: 60_000,      // Keep in cache for 60s between page renders
    retry: false,
  });

  const login = useCallback(() => {
    const base = import.meta.env.BASE_URL?.replace(/\/+$/, "") || "";
    const returnTo = base || "/";
    window.location.href = `/api/login?returnTo=${encodeURIComponent(returnTo)}`;
  }, []);

  const logout = useCallback(() => {
    window.location.href = "/api/logout";
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
  };
}

import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/app/layouts/app-shell";
import { useAuth } from "@/lib/auth/auth-context";

export const Route = createFileRoute("/_authenticated")({
  // No SSR loader auth check — we hydrate on the client to avoid SSR redirects that
  // interfere with the mock localStorage session.
  ssr: false,
  component: AuthedLayout,
});

function AuthedLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", replace: true });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

// Prevent unused import warning while keeping the API accessible.
void redirect;

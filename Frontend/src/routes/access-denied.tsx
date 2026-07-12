import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/access-denied")({
  head: () => ({ meta: [{ title: "Access denied — TransitOps" }] }),
  component: AccessDenied,
});

function AccessDenied() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="max-w-md rounded-lg border bg-card p-8 text-center">
        <ShieldAlert className="mx-auto size-10 text-destructive" />
        <h1 className="mt-3 text-xl font-semibold">Access denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your role does not have permission to view this page. Contact your administrator if you
          believe this is a mistake.
        </p>
        <Link
          to="/dashboard"
          className="mt-4 inline-block rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}

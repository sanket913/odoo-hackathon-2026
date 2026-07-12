import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { authApi } from "@/lib/api/services";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — TransitOps" }] }),
  component: ResetPage,
});

function ResetPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setLoading(true);
    await authApi.resetPassword("token", password);
    setLoading(false);
    setDone(true);
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border bg-card p-6">
        <h1 className="text-xl font-semibold">Set a new password</h1>
        {done ? (
          <>
            <p className="mt-3 text-sm text-muted-foreground">Your password has been updated.</p>
            <Link to="/login" className="mt-4 inline-block text-sm text-brand hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            />
            {error && (
              <div
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive"
              >
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="h-10 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {loading ? "Saving…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

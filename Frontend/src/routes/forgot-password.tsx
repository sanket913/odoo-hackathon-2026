import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { authApi } from "@/lib/api/services";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot password — TransitOps" }] }),
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await authApi.requestReset(email);
    setLoading(false);
    setSent(true);
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border bg-card p-6">
        <h1 className="text-xl font-semibold">Reset your password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a reset link.
        </p>
        {sent ? (
          <div className="mt-6 rounded-md border border-status-available-foreground/40 bg-status-available/40 p-3 text-sm">
            If an account exists for {email}, a reset link has been sent.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              placeholder="you@company.com"
            />
            <button
              type="submit"
              disabled={loading}
              className="h-10 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}
        <div className="mt-4 text-center text-sm">
          <Link to="/login" className="text-brand hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

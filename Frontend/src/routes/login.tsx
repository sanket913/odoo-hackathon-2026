import { createFileRoute, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { Truck, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

const DEMO_ACCOUNTS = [
  { role: "Admin", email: "admin@transitops.dev" },
  { role: "Fleet Manager", email: "fleet@transitops.dev" },
  { role: "Dispatcher", email: "dispatch@transitops.dev" },
  { role: "Safety Officer", email: "safety@transitops.dev" },
  { role: "Financial Analyst", email: "finance@transitops.dev" },
];

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — TransitOps" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [email, setEmail] = useState("dispatch@transitops.dev");
  const [password, setPassword] = useState("demo1234");
  const [remember, setRemember] = useState(true);
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user && pathname === "/login") {
    navigate({ to: "/dashboard", replace: true });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-dvh grid-cols-1 md:grid-cols-2">
      {/* Left brand panel */}
      <aside className="relative hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground md:flex">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Truck className="size-5" />
          </div>
          <div className="text-lg font-semibold">{APP_NAME}</div>
        </div>
        <div className="space-y-6">
          <h1 className="text-3xl font-semibold leading-tight text-balance">{APP_TAGLINE}</h1>
          <p className="max-w-md text-sm text-sidebar-foreground/80">
            One cockpit for fleet operations — dispatch trips, prevent conflicts before they happen,
            monitor compliance, and analyse cost across every kilometre.
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {["Fleet Manager", "Dispatcher", "Safety Officer", "Financial Analyst"].map((r) => (
              <div
                key={r}
                className="rounded-md border border-sidebar-border bg-sidebar-accent/40 px-3 py-2"
              >
                {r}
              </div>
            ))}
          </div>
        </div>
        <div className="text-xs text-sidebar-foreground/60">
          © {new Date().getFullYear()} {APP_NAME}
        </div>
      </aside>

      {/* Right form */}
      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-2 md:hidden">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Truck className="size-4" />
            </div>
            <div className="font-semibold">{APP_NAME}</div>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Access your operations cockpit. Your role is granted by the system administrator.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm focus:border-ring focus:outline-hidden focus:ring-2 focus:ring-ring/30"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs text-brand hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={show ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 w-full rounded-md border bg-background px-3 pr-10 text-sm focus:border-ring focus:outline-hidden focus:ring-2 focus:ring-ring/30"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="size-4"
              />
              Remember me on this device
            </label>

            {error && (
              <div
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary font-medium text-primary-foreground disabled:opacity-60"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              Sign in
            </button>
          </form>

          <div className="mt-8 rounded-md border bg-muted/40 p-3 text-xs">
            <div className="mb-2 font-semibold">
              Demo accounts (mock mode, password any 4+ chars)
            </div>
            <ul className="space-y-1">
              {DEMO_ACCOUNTS.map((a) => (
                <li key={a.email} className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">{a.role}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(a.email);
                      setPassword("demo1234");
                    }}
                    className="font-mono text-[11px] text-brand hover:underline"
                  >
                    {a.email}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}

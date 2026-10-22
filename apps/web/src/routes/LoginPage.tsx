import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  BookOpenCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  LineChart,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Alert, Button, Field, Spinner } from "@/components/ui";
import { AuthAside } from "@/components/layout/AuthAside";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

const DEMO_EMAIL = "owner@demo-firm.test";
const DEMO_PASSWORD = "Password123!";

export function LoginPage() {
  const { login, user, loading } = useAuth();
  useDocumentTitle("Sign in · Accountant OS");
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function signIn(nextEmail: string, nextPassword: string) {
    setError(null);
    setSubmitting(true);
    try {
      await login(nextEmail, nextPassword);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    await signIn(email.trim(), password);
  }

  async function onUseDemo() {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    await signIn(DEMO_EMAIL, DEMO_PASSWORD);
  }

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="flex min-h-screen bg-white">
      <AuthAside
        headline="The operating system for a modern accounting practice."
        description="Keep every client's books, compliance calendar, and review queue in one calm, auditable workspace."
        points={[
          { icon: LineChart, text: "Real-time books across every client entity" },
          { icon: ShieldCheck, text: "Role-aware reviews and audit-ready trails" },
          { icon: Sparkles, text: "AI-assisted workflows with human sign-off" },
        ]}
      />

      <div className="flex w-full flex-col lg:w-1/2">
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5 lg:hidden">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white">
            <BookOpenCheck className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-sm font-semibold text-slate-900">Professional Accountant OS</span>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-sm">
            <p className="section-heading">Welcome back</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Sign in to your firm</h1>
            <p className="mt-2 text-sm text-slate-500">Enter your credentials to open the practice workspace.</p>

            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              {error && <Alert>{error}</Alert>}

              <Field label="Work email" required>
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@firm.com"
                  className="w-full"
                />
              </Field>

              <Field label="Password" required>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    className="w-full pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="ghost absolute inset-y-0 right-0 my-auto h-8 p-2 text-slate-400 hover:bg-transparent hover:text-slate-700"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Spinner /> : null}
                {submitting ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Demo firm</p>
                  <p className="mt-1 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">owner@demo-firm.test</span> /{" "}
                    <span className="font-medium text-slate-700">Password123!</span>
                  </p>
                </div>
                <button
                  type="button"
                  className="secondary shrink-0 px-3 py-1.5 text-xs"
                  onClick={() => void onUseDemo()}
                  disabled={submitting}
                >
                  {submitting ? "Opening…" : "Use demo"}
                </button>
              </div>
            </div>

            <p className="mt-6 text-center text-sm text-slate-500">
              New firm?{" "}
              <Link to="/register" className="font-semibold">
                Register your practice
              </Link>
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 border-t border-slate-100 px-6 py-4 text-[11px] text-slate-400">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
          Multi-tenant, permission-aware, and audit-ready by design.
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { BookOpenCheck, Eye, EyeOff, Rocket, ShieldCheck, Users } from "lucide-react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Alert, Button, Field, Spinner } from "@/components/ui";
import { AuthAside } from "@/components/layout/AuthAside";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

export function RegisterPage() {
  const { registerFirm, user, loading } = useAuth();
  useDocumentTitle("Create your firm · Accountant OS");
  const [form, setForm] = useState({
    firmName: "",
    email: "",
    password: "",
    firstName: "",
    lastName: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await registerFirm({
        ...form,
        firmName: form.firmName.trim(),
        email: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="flex min-h-screen bg-white">
      <AuthAside
        headline="Set up your practice in minutes, not weeks."
        description="Give your team one place for books, compliance, and client collaboration — with guardrails built in."
        points={[
          { icon: Rocket, text: "Guided onboarding with a ready-made chart of accounts" },
          { icon: Users, text: "Invite your team with granular client permissions" },
          { icon: ShieldCheck, text: "Every action traceable, every review accountable" },
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
          <div className="w-full max-w-md">
            <p className="section-heading">Get started</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Create your firm</h1>
            <p className="mt-2 text-sm text-slate-500">
              You will be the firm owner and can invite the rest of your team afterwards.
            </p>

            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              {error && <Alert>{error}</Alert>}

              <Field label="Firm name" required>
                <input
                  required
                  value={form.firmName}
                  onChange={(event) => update("firmName", event.target.value)}
                  placeholder="Sterling & Co. Chartered Accountants"
                  className="w-full"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="First name" required>
                  <input
                    required
                    autoComplete="given-name"
                    value={form.firstName}
                    onChange={(event) => update("firstName", event.target.value)}
                    placeholder="Amina"
                    className="w-full"
                  />
                </Field>
                <Field label="Last name" required>
                  <input
                    required
                    autoComplete="family-name"
                    value={form.lastName}
                    onChange={(event) => update("lastName", event.target.value)}
                    placeholder="Khan"
                    className="w-full"
                  />
                </Field>
              </div>

              <Field label="Work email" required>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={(event) => update("email", event.target.value)}
                  placeholder="you@firm.com"
                  className="w-full"
                />
              </Field>

              <Field label="Password" required hint="Use at least 8 characters.">
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(event) => update("password", event.target.value)}
                    placeholder="Create a strong password"
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
                {submitting ? "Creating your firm…" : "Create firm workspace"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 border-t border-slate-100 px-6 py-4 text-[11px] text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
          Your firm data is isolated from every other tenant.
        </div>
      </div>
    </div>
  );
}

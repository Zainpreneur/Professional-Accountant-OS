"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";

export default function RegisterPage() {
  const { registerFirm } = useAuth();
  const [form, setForm] = useState({ firmName: "", email: "", password: "", firstName: "", lastName: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await registerFirm(form);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
      <form onSubmit={onSubmit} className="card stack" style={{ width: 400 }}>
        <h1 style={{ fontSize: 20, margin: "0 0 4px" }}>Register your practice</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          Creates your firm and a Firm Owner account with full permissions.
        </p>

        <div className="stack">
          <label>Firm name</label>
          <input value={form.firmName} onChange={(e) => update("firmName", e.target.value)} required />
        </div>
        <div className="row">
          <div className="stack" style={{ flex: 1 }}>
            <label>First name</label>
            <input value={form.firstName} onChange={(e) => update("firstName", e.target.value)} required />
          </div>
          <div className="stack" style={{ flex: 1 }}>
            <label>Last name</label>
            <input value={form.lastName} onChange={(e) => update("lastName", e.target.value)} required />
          </div>
        </div>
        <div className="stack">
          <label>Email</label>
          <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
        </div>
        <div className="stack">
          <label>Password</label>
          <input
            type="password"
            minLength={8}
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            required
          />
        </div>

        {error && <div className="error">{error}</div>}

        <button type="submit" disabled={submitting}>
          {submitting ? "Creating..." : "Create firm"}
        </button>

        <p className="muted">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("owner@demo-firm.test");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
      <form onSubmit={onSubmit} className="card stack" style={{ width: 360 }}>
        <h1 style={{ fontSize: 20, margin: "0 0 4px" }}>Professional Accountant OS</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          Sign in to your firm workspace
        </p>

        <div className="stack">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="stack">
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>

        {error && <div className="error">{error}</div>}

        <button type="submit" disabled={submitting}>
          {submitting ? "Signing in..." : "Sign in"}
        </button>

        <p className="muted">
          New firm? <Link href="/register">Register your practice</Link>
        </p>
        <p className="muted" style={{ fontSize: 12 }}>
          Demo login: owner@demo-firm.test / Password123! (after running <code>pnpm db:seed</code>)
        </p>
      </form>
    </div>
  );
}

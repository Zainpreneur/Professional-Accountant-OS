"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  normalBalance: string;
  isControlAccount: boolean;
  controlAccountType: string | null;
  active: boolean;
}

const ACCOUNT_TYPES = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];

export default function AccountsPage({ params }: { params: { clientId: string } }) {
  const { clientId } = params;
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", type: "EXPENSE", normalBalance: "DEBIT" });
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      setAccounts(await api<Account[]>(`/clients/${clientId}/accounts`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load chart of accounts");
    }
  }

  useEffect(() => {
    load();
  }, [clientId]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api(`/clients/${clientId}/accounts`, { method: "POST", body: form });
      setForm({ code: "", name: "", type: "EXPENSE", normalBalance: "DEBIT" });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create account");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>Chart of accounts</h2>
        <button onClick={() => setShowForm((s) => !s)}>{showForm ? "Cancel" : "+ New account"}</button>
      </div>

      {showForm && (
        <form onSubmit={onCreate} className="card row" style={{ alignItems: "flex-end" }}>
          <div className="stack">
            <label>Code</label>
            <input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} required />
          </div>
          <div className="stack" style={{ flex: 1 }}>
            <label>Name</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="stack">
            <label>Type</label>
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              {ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="stack">
            <label>Normal balance</label>
            <select value={form.normalBalance} onChange={(e) => setForm((f) => ({ ...f, normalBalance: e.target.value }))}>
              <option value="DEBIT">Debit</option>
              <option value="CREDIT">Credit</option>
            </select>
          </div>
          <button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Add"}
          </button>
        </form>
      )}

      {error && <div className="error">{error}</div>}

      <div className="card">
        {accounts === null ? (
          <p className="muted">Loading...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Type</th>
                <th>Normal balance</th>
                <th>Control account</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id}>
                  <td>{a.code}</td>
                  <td>{a.name}</td>
                  <td>{a.type}</td>
                  <td>{a.normalBalance}</td>
                  <td>{a.controlAccountType ?? (a.isControlAccount ? "Yes" : "-")}</td>
                  <td>
                    <span className={`badge ${a.active ? "active" : "void"}`}>{a.active ? "Active" : "Inactive"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

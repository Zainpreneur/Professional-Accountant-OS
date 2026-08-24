"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

interface Customer {
  id: string;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  active: boolean;
}

export default function CustomersPage({ params }: { params: { clientId: string } }) {
  const { clientId } = params;
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", email: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      setCustomers(await api<Customer[]>(`/clients/${clientId}/customers`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load customers");
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
      await api(`/clients/${clientId}/customers`, { method: "POST", body: form });
      setForm({ code: "", name: "", email: "", phone: "" });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create customer");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>Customers</h2>
        <button onClick={() => setShowForm((s) => !s)}>{showForm ? "Cancel" : "+ New customer"}</button>
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
            <label>Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="stack">
            <label>Phone</label>
            <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </div>
          <button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Add"}
          </button>
        </form>
      )}

      {error && <div className="error">{error}</div>}

      <div className="card">
        {customers === null ? (
          <p className="muted">Loading...</p>
        ) : customers.length === 0 ? (
          <p className="muted">No customers yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td>{c.code}</td>
                  <td>{c.name}</td>
                  <td>{c.email ?? "-"}</td>
                  <td>{c.phone ?? "-"}</td>
                  <td>
                    <span className={`badge ${c.active ? "active" : "void"}`}>{c.active ? "Active" : "Inactive"}</span>
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

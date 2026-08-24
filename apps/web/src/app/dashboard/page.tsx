"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";

interface Client {
  id: string;
  legalName: string;
  tradingName: string | null;
  businessCategory: string | null;
  jurisdiction: string;
  status: string;
  createdAt: string;
}

export default function FirmDashboardPage() {
  const [clients, setClients] = useState<Client[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    legalName: "",
    tradingName: "",
    entityType: "",
    businessCategory: "",
    jurisdiction: "SA",
    taxRegistrationNumber: "",
  });
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      setClients(await api<Client[]>("/clients"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load clients");
    }
  }

  useEffect(() => {
    load();
  }, []);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api("/clients", { method: "POST", body: form });
      setForm({ legalName: "", tradingName: "", entityType: "", businessCategory: "", jurisdiction: "SA", taxRegistrationNumber: "" });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create client");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>Clients</h1>
        <button onClick={() => setShowForm((s) => !s)}>{showForm ? "Cancel" : "+ New client"}</button>
      </div>

      {showForm && (
        <form onSubmit={onCreate} className="card stack">
          <div className="row">
            <div className="stack" style={{ flex: 1 }}>
              <label>Legal name *</label>
              <input value={form.legalName} onChange={(e) => update("legalName", e.target.value)} required />
            </div>
            <div className="stack" style={{ flex: 1 }}>
              <label>Trading name</label>
              <input value={form.tradingName} onChange={(e) => update("tradingName", e.target.value)} />
            </div>
          </div>
          <div className="row">
            <div className="stack" style={{ flex: 1 }}>
              <label>Entity type</label>
              <input
                placeholder="e.g. LLC"
                value={form.entityType}
                onChange={(e) => update("entityType", e.target.value)}
              />
            </div>
            <div className="stack" style={{ flex: 1 }}>
              <label>Business category</label>
              <input
                placeholder="e.g. Retail"
                value={form.businessCategory}
                onChange={(e) => update("businessCategory", e.target.value)}
              />
            </div>
            <div className="stack" style={{ flex: 1 }}>
              <label>Jurisdiction</label>
              <input value={form.jurisdiction} onChange={(e) => update("jurisdiction", e.target.value)} />
            </div>
          </div>
          <div className="stack">
            <label>Tax registration number</label>
            <input
              value={form.taxRegistrationNumber}
              onChange={(e) => update("taxRegistrationNumber", e.target.value)}
            />
          </div>
          {error && <div className="error">{error}</div>}
          <div>
            <button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create client"}
            </button>
          </div>
        </form>
      )}

      {!showForm && error && <div className="error">{error}</div>}

      <div className="card">
        {clients === null ? (
          <p className="muted">Loading...</p>
        ) : clients.length === 0 ? (
          <p className="muted">No clients yet. Create your first client to get started.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Legal name</th>
                <th>Category</th>
                <th>Jurisdiction</th>
                <th>Status</th>
                <th>Onboarded</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/dashboard/clients/${c.id}`}>{c.legalName}</Link>
                    {c.tradingName && <div className="muted">{c.tradingName}</div>}
                  </td>
                  <td>{c.businessCategory ?? "-"}</td>
                  <td>{c.jurisdiction}</td>
                  <td>
                    <span className={`badge ${c.status.toLowerCase()}`}>{c.status}</span>
                  </td>
                  <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

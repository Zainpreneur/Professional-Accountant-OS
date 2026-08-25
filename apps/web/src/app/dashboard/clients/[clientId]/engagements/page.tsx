"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";

interface UserRef {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}
interface Engagement {
  id: string;
  serviceType: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  acceptanceStatus: string;
  independenceStatus: string | null;
  materialityAmount: string | null;
  createdBy: UserRef;
  concludedBy: UserRef | null;
  approvedBy: UserRef | null;
}

const SERVICE_TYPES = ["AUDIT", "REVIEW", "COMPILATION", "TAX_ADVISORY", "BOOKKEEPING", "CONSULTING", "OTHER"];

export default function EngagementsPage({ params }: { params: { clientId: string } }) {
  const { clientId } = params;
  const [engagements, setEngagements] = useState<Engagement[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    serviceType: "AUDIT",
    periodStart: "",
    periodEnd: "",
    materialityAmount: "",
    materialityBasis: "",
    scope: "",
  });

  async function load() {
    try {
      const data = await api<Engagement[]>(`/clients/${clientId}/engagements`);
      setEngagements(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load engagements");
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
      await api(`/clients/${clientId}/engagements`, {
        method: "POST",
        body: {
          serviceType: form.serviceType,
          periodStart: form.periodStart,
          periodEnd: form.periodEnd,
          materialityAmount: form.materialityAmount ? parseFloat(form.materialityAmount) : undefined,
          materialityBasis: form.materialityBasis || undefined,
          scope: form.scope || undefined,
        },
      });
      setForm({ serviceType: "AUDIT", periodStart: "", periodEnd: "", materialityAmount: "", materialityBasis: "", scope: "" });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create engagement");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>Engagements</h2>
        <button onClick={() => setShowForm((s) => !s)}>{showForm ? "Cancel" : "+ New engagement"}</button>
      </div>

      {showForm && (
        <form onSubmit={onCreate} className="card stack">
          <div className="row" style={{ alignItems: "flex-end" }}>
            <div className="stack">
              <label>Service type</label>
              <select value={form.serviceType} onChange={(e) => setForm((f) => ({ ...f, serviceType: e.target.value }))}>
                {SERVICE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="stack">
              <label>Period start</label>
              <input type="date" value={form.periodStart} onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))} required />
            </div>
            <div className="stack">
              <label>Period end</label>
              <input type="date" value={form.periodEnd} onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))} required />
            </div>
            <div className="stack">
              <label>Materiality amount</label>
              <input
                type="number"
                step="0.01"
                value={form.materialityAmount}
                onChange={(e) => setForm((f) => ({ ...f, materialityAmount: e.target.value }))}
              />
            </div>
          </div>
          <div className="row" style={{ alignItems: "flex-end" }}>
            <div className="stack" style={{ flex: 1 }}>
              <label>Materiality basis</label>
              <input
                placeholder="e.g. 5% of net income"
                value={form.materialityBasis}
                onChange={(e) => setForm((f) => ({ ...f, materialityBasis: e.target.value }))}
              />
            </div>
            <div className="stack" style={{ flex: 1 }}>
              <label>Scope</label>
              <input value={form.scope} onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value }))} />
            </div>
            <button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create engagement"}
            </button>
          </div>
        </form>
      )}

      {error && <div className="error">{error}</div>}

      <div className="card">
        {engagements === null ? (
          <p className="muted">Loading...</p>
        ) : engagements.length === 0 ? (
          <p className="muted">No engagements yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Service</th>
                <th>Period</th>
                <th>Acceptance</th>
                <th>Independence</th>
                <th>Materiality</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {engagements.map((e) => (
                <tr key={e.id}>
                  <td>{e.serviceType.replace("_", " ")}</td>
                  <td>
                    {new Date(e.periodStart).toLocaleDateString()} - {new Date(e.periodEnd).toLocaleDateString()}
                  </td>
                  <td>
                    <span className={`badge ${e.acceptanceStatus.toLowerCase()}`}>{e.acceptanceStatus}</span>
                  </td>
                  <td>
                    {e.independenceStatus ? (
                      <span className={`badge ${e.independenceStatus.toLowerCase()}`}>{e.independenceStatus}</span>
                    ) : (
                      <span className="muted">Not checked</span>
                    )}
                  </td>
                  <td>{e.materialityAmount ? Number(e.materialityAmount).toLocaleString() : "-"}</td>
                  <td>
                    <span className={`badge ${e.status.toLowerCase()}`}>{e.status.replace("_", " ")}</span>
                  </td>
                  <td>
                    <Link href={`/dashboard/clients/${clientId}/engagements/${e.id}`}>Open →</Link>
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

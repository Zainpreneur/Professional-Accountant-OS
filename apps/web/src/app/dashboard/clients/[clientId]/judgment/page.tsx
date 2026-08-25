"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface UserRef {
  id: string;
  firstName: string;
  lastName: string;
}
interface Engagement {
  id: string;
  serviceType: string;
}
interface JudgmentCase {
  id: string;
  question: string;
  facts: string;
  applicableStandards: string | null;
  possibleTreatments: unknown;
  risk: string;
  status: string;
  decision: string | null;
  recommendation: string | null;
  createdBy: UserRef;
  decidedBy: UserRef | null;
  decidedById: string | null;
  approvedBy: UserRef | null;
  engagement: Engagement | null;
}

const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH"];

export default function JudgmentPage({ params }: { params: { clientId: string } }) {
  const { clientId } = params;
  const { user } = useAuth();
  const [cases, setCases] = useState<JudgmentCase[] | null>(null);
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    engagementId: "",
    question: "",
    facts: "",
    applicableStandards: "",
    risk: "MEDIUM",
  });
  const [decideForm, setDecideForm] = useState<Record<string, { decision: string; recommendation: string }>>({});

  async function load() {
    try {
      const [c, e] = await Promise.all([
        api<JudgmentCase[]>(`/clients/${clientId}/judgment-cases`),
        api<Engagement[]>(`/clients/${clientId}/engagements`),
      ]);
      setCases(c);
      setEngagements(e);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load judgment cases");
    }
  }

  useEffect(() => {
    load();
  }, [clientId]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    run(() =>
      api(`/clients/${clientId}/judgment-cases`, {
        method: "POST",
        body: {
          engagementId: form.engagementId || undefined,
          question: form.question,
          facts: form.facts,
          applicableStandards: form.applicableStandards || undefined,
          risk: form.risk,
        },
      }),
    ).then(() => {
      setForm({ engagementId: "", question: "", facts: "", applicableStandards: "", risk: "MEDIUM" });
      setShowForm(false);
    });
  }

  function onDecide(caseId: string) {
    const f = decideForm[caseId];
    if (!f?.decision) {
      setError("A decision is required");
      return;
    }
    run(() =>
      api(`/clients/${clientId}/judgment-cases/${caseId}/decide`, {
        method: "POST",
        body: { decision: f.decision, recommendation: f.recommendation || undefined },
      }),
    );
  }

  function onApprove(caseId: string) {
    run(() => api(`/clients/${clientId}/judgment-cases/${caseId}/approve`, { method: "POST" }));
  }

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>Professional judgment (SRS 35)</h2>
        <button onClick={() => setShowForm((s) => !s)}>{showForm ? "Cancel" : "+ New judgment case"}</button>
      </div>
      <p className="muted">
        Question → facts → applicable standards → possible treatments → professional decision → partner approval.
        Treatments and decisions are entered by the professional - this app does not fabricate recommendations.
      </p>

      {showForm && (
        <form onSubmit={onCreate} className="card stack">
          <div className="stack">
            <label>Question</label>
            <input value={form.question} onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))} required />
          </div>
          <div className="stack">
            <label>Facts</label>
            <textarea rows={3} value={form.facts} onChange={(e) => setForm((f) => ({ ...f, facts: e.target.value }))} required />
          </div>
          <div className="row" style={{ alignItems: "flex-end" }}>
            <div className="stack" style={{ flex: 1 }}>
              <label>Applicable standards</label>
              <input value={form.applicableStandards} onChange={(e) => setForm((f) => ({ ...f, applicableStandards: e.target.value }))} />
            </div>
            <div className="stack">
              <label>Engagement</label>
              <select value={form.engagementId} onChange={(e) => setForm((f) => ({ ...f, engagementId: e.target.value }))}>
                <option value="">None</option>
                {engagements.map((e) => <option key={e.id} value={e.id}>{e.serviceType}</option>)}
              </select>
            </div>
            <div className="stack">
              <label>Risk</label>
              <select value={form.risk} onChange={(e) => setForm((f) => ({ ...f, risk: e.target.value }))}>
                {RISK_LEVELS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <button type="submit" disabled={busy}>Create case</button>
          </div>
        </form>
      )}

      {error && <div className="error">{error}</div>}

      {cases === null ? (
        <p className="muted">Loading...</p>
      ) : cases.length === 0 ? (
        <p className="muted">No judgment cases yet.</p>
      ) : (
        cases.map((c) => {
          const isOwnDecision = user && c.decidedById === user.id;
          return (
            <div key={c.id} className="card stack">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <strong>{c.question}</strong>
                <div className="row">
                  <span className={`badge ${c.risk.toLowerCase()}`}>{c.risk} risk</span>
                  <span className={`badge ${c.status.toLowerCase()}`}>{c.status}</span>
                </div>
              </div>
              <div className="muted">{c.facts}</div>
              {c.applicableStandards && <div className="muted">Standards: {c.applicableStandards}</div>}
              {c.engagement && <div className="muted">Engagement: {c.engagement.serviceType}</div>}

              {c.status === "OPEN" && (
                <div className="stack">
                  <label>Professional decision</label>
                  <textarea
                    rows={2}
                    value={decideForm[c.id]?.decision ?? ""}
                    onChange={(e) => setDecideForm((f) => ({ ...f, [c.id]: { decision: e.target.value, recommendation: f[c.id]?.recommendation ?? "" } }))}
                  />
                  <label>Recommendation</label>
                  <input
                    value={decideForm[c.id]?.recommendation ?? ""}
                    onChange={(e) => setDecideForm((f) => ({ ...f, [c.id]: { decision: f[c.id]?.decision ?? "", recommendation: e.target.value } }))}
                  />
                  <button disabled={busy} onClick={() => onDecide(c.id)}>Record decision</button>
                </div>
              )}

              {c.decision && (
                <div className="stack">
                  <div>
                    <strong>Decision: </strong>
                    {c.decision}
                  </div>
                  <div className="muted">
                    Decided by {c.decidedBy?.firstName} {c.decidedBy?.lastName}
                  </div>
                  {c.status === "DECIDED" && (
                    <div className="stack">
                      {isOwnDecision && (
                        <div className="muted">You made this decision - it must be approved by someone else (SRS 55).</div>
                      )}
                      <button disabled={busy || !!isOwnDecision} onClick={() => onApprove(c.id)}>Approve decision</button>
                    </div>
                  )}
                  {c.status === "APPROVED" && (
                    <div className="muted">
                      Approved by {c.approvedBy?.firstName} {c.approvedBy?.lastName}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

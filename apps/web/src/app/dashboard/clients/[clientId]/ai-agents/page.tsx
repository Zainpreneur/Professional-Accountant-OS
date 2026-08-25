"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

interface UserRef {
  id: string;
  firstName: string;
  lastName: string;
}
interface AiAgentRun {
  id: string;
  agentType: string;
  entityType: string | null;
  entityId: string | null;
  title: string;
  observation: string;
  reasoning: string;
  confidence: number;
  dataCompleteness: number;
  evidenceQuality: string;
  ruleCertainty: string;
  risk: string;
  materiality: string | null;
  recommendedAction: string;
  reviewSeverity: string;
  status: string;
  reviewedBy: UserRef | null;
  reviewedAt: string | null;
  reviewDecision: string | null;
  reviewNotes: string | null;
  createdAt: string;
}

const AGENTS = ["ACCOUNTING", "TAX", "AUDIT", "RECONCILIATION", "REPORTING", "DOCUMENT", "COMPLIANCE", "FINANCIAL_ANALYST"];

const SEVERITY_ORDER = ["PROFESSIONAL_JUDGMENT", "CA_REVIEW", "ACCOUNTANT_REVIEW", "CLIENT_CLARIFICATION", "AUTO_VALIDATED"];
const SEVERITY_LABELS: Record<string, string> = {
  PROFESSIONAL_JUDGMENT: "🔴 Professional judgment required",
  CA_REVIEW: "🟠 CA review required",
  ACCOUNTANT_REVIEW: "🟡 Accountant review required",
  CLIENT_CLARIFICATION: "🔵 Client clarification required",
  AUTO_VALIDATED: "🟢 Auto-validated",
};

export default function AiAgentsPage({ params }: { params: { clientId: string } }) {
  const { clientId } = params;
  const [buckets, setBuckets] = useState<Record<string, AiAgentRun[]> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyAgent, setBusyAgent] = useState<string | null>(null);
  const [reviewForm, setReviewForm] = useState<Record<string, { decision: string; notes: string }>>({});
  const [busyReview, setBusyReview] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<AiAgentRun[] | null>(null);

  async function load() {
    try {
      const data = await api<{ bySeverity: Record<string, AiAgentRun[]> }>(`/clients/${clientId}/ai-agents/queue`);
      setBuckets(data.bySeverity);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load the review queue");
    }
  }

  async function loadHistory() {
    try {
      const data = await api<{ runs: AiAgentRun[] }>(`/clients/${clientId}/ai-agents/queue?status=REVIEWED`);
      setHistory(data.runs);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load review history");
    }
  }

  useEffect(() => {
    load();
  }, [clientId]);

  async function onRunAll() {
    setBusyAgent("ALL");
    setError(null);
    try {
      await api(`/clients/${clientId}/ai-agents/run-all`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to run agents");
    } finally {
      setBusyAgent(null);
    }
  }

  async function onRunOne(agentType: string) {
    setBusyAgent(agentType);
    setError(null);
    try {
      await api(`/clients/${clientId}/ai-agents/${agentType}/run`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Failed to run the ${agentType} agent`);
    } finally {
      setBusyAgent(null);
    }
  }

  async function onReview(runId: string) {
    const f = reviewForm[runId];
    if (!f?.decision) {
      setError("Choose a decision before submitting");
      return;
    }
    setBusyReview(runId);
    setError(null);
    try {
      await api(`/clients/${clientId}/ai-agents/runs/${runId}/review`, {
        method: "POST",
        body: { decision: f.decision, notes: f.notes || undefined },
      });
      await load();
      if (showHistory) await loadHistory();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to submit review");
    } finally {
      setBusyReview(null);
    }
  }

  async function onToggleHistory() {
    const next = !showHistory;
    setShowHistory(next);
    if (next && history === null) await loadHistory();
  }

  const totalOpen = buckets ? Object.values(buckets).reduce((sum, list) => sum + list.length, 0) : 0;

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>AI Workforce - Review Queue</h2>
        <button disabled={busyAgent !== null} onClick={onRunAll}>
          {busyAgent === "ALL" ? "Running..." : "Run all agents"}
        </button>
      </div>
      <p className="muted">
        8 agents (SRS §37-38) scan real client data for things worth a professional's attention - stale drafts,
        unmatched bank lines, missing WHT categories, unresolved audit findings, and more. Every finding cites the
        actual records it was computed from and requires a human decision here; no agent ever posts, files, or
        modifies a record on its own (SRS §4).
      </p>

      <div className="row">
        {AGENTS.map((a) => (
          <button key={a} className="secondary" disabled={busyAgent !== null} onClick={() => onRunOne(a)}>
            {busyAgent === a ? "Running..." : `Run ${a.replace("_", " ").toLowerCase()}`}
          </button>
        ))}
      </div>

      {error && <div className="error">{error}</div>}

      {buckets === null ? (
        <p className="muted">Loading...</p>
      ) : (
        <div className="kpi-grid">
          {SEVERITY_ORDER.map((s) => (
            <div className="kpi" key={s}>
              <div className="value">{buckets[s]?.length ?? 0}</div>
              <div className="label">{SEVERITY_LABELS[s]}</div>
            </div>
          ))}
        </div>
      )}

      {buckets && totalOpen === 0 && <p className="muted">No open findings. Run the agents to scan for new ones.</p>}

      {buckets &&
        SEVERITY_ORDER.filter((s) => buckets[s]?.length > 0).map((severity) => (
          <div className="stack" key={severity}>
            <strong>{SEVERITY_LABELS[severity]}</strong>
            {buckets[severity].map((run) => (
              <div className="card stack" key={run.id}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <strong>{run.title}</strong>
                  <div className="row">
                    <span className="muted">{run.agentType.replace("_", " ")}</span>
                    <span className={`badge ${run.risk.toLowerCase()}`}>{run.risk} risk</span>
                  </div>
                </div>
                <div>{run.observation}</div>
                <div className="muted">{run.reasoning}</div>
                <div className="muted">
                  Confidence {run.confidence}% · Data completeness {run.dataCompleteness}% · {run.ruleCertainty}
                  {run.materiality && <> · Materiality {Number(run.materiality).toLocaleString()}</>}
                </div>
                <div className="muted">Evidence: {run.evidenceQuality}</div>

                <div className="row" style={{ alignItems: "flex-end" }}>
                  <div className="stack">
                    <label>Decision</label>
                    <select
                      value={reviewForm[run.id]?.decision ?? ""}
                      onChange={(e) => setReviewForm((f) => ({ ...f, [run.id]: { decision: e.target.value, notes: f[run.id]?.notes ?? "" } }))}
                    >
                      <option value="">Choose...</option>
                      <option value="APPROVED">Approved - will act on this</option>
                      <option value="REJECTED">Rejected - not a real issue</option>
                      <option value="OVERRIDDEN">Overridden - handling it differently</option>
                    </select>
                  </div>
                  <div className="stack" style={{ flex: 1 }}>
                    <label>Notes</label>
                    <input
                      value={reviewForm[run.id]?.notes ?? ""}
                      onChange={(e) => setReviewForm((f) => ({ ...f, [run.id]: { decision: f[run.id]?.decision ?? "", notes: e.target.value } }))}
                    />
                  </div>
                  <button className="secondary" disabled={busyReview === run.id} onClick={() => onReview(run.id)}>
                    {busyReview === run.id ? "Saving..." : "Submit review"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}

      <div className="row" style={{ justifyContent: "space-between" }}>
        <h3 style={{ fontSize: 14, margin: 0 }}>Review history</h3>
        <button className="secondary" onClick={onToggleHistory}>
          {showHistory ? "Hide" : "Show"}
        </button>
      </div>
      {showHistory && (
        <div className="card">
          {history === null ? (
            <p className="muted">Loading...</p>
          ) : history.length === 0 ? (
            <p className="muted">No reviewed findings yet.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Agent</th>
                  <th>Decision</th>
                  <th>Reviewed by</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {history.map((run) => (
                  <tr key={run.id}>
                    <td>{run.title}</td>
                    <td>{run.agentType.replace("_", " ")}</td>
                    <td>{run.reviewDecision}</td>
                    <td>{run.reviewedBy ? `${run.reviewedBy.firstName} ${run.reviewedBy.lastName}` : "-"}</td>
                    <td>{run.reviewNotes ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

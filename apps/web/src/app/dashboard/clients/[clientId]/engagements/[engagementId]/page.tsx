"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface UserRef {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}
interface TeamMember {
  id: string;
  role: string;
  user: UserRef;
}
interface IndependenceCheck {
  id: string;
  hasFinancialInterest: boolean;
  hasCloseRelationship: boolean;
  hasPriorEngagementConflict: boolean;
  hasProhibitedActivity: boolean;
  selfReviewThreat: boolean;
  familiarityThreat: boolean;
  advocacyThreat: boolean;
  managementParticipationThreat: boolean;
  notes: string | null;
  status: string;
  checkedBy: UserRef;
  resolution: string;
  resolutionNotes: string | null;
  resolvedBy: UserRef | null;
}
interface CompletionItem {
  id: string;
  item: string;
  status: string;
  notes: string | null;
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
  materialityBasis: string | null;
  scope: string | null;
  conclusionText: string | null;
  createdBy: UserRef;
  concludedBy: UserRef | null;
  concludedById: string | null;
  approvedBy: UserRef | null;
  approvedById: string | null;
  teamMembers: TeamMember[];
  independenceChecks: IndependenceCheck[];
  completionItems: CompletionItem[];
}
interface Risk {
  id: string;
  description: string;
  category: string;
  assertion: string | null;
  likelihood: string;
  impact: string;
  isSignificant: boolean;
  response: string | null;
}
interface Procedure {
  id: string;
  assertion: string;
  procedureType: string;
  description: string;
  sampleSize: number | null;
  status: string;
  conclusion: string | null;
  risk: Risk | null;
}
interface Evidence {
  id: string;
  description: string;
  evidenceType: string;
  obtainedById: string;
}
interface Finding {
  id: string;
  type: string;
  assertion: string | null;
  description: string;
  amount: string | null;
  severity: string;
  status: string;
  recommendation: string | null;
  managementResponse: string | null;
}

const THREAT_FIELDS: Array<{ key: keyof IndependenceCheck; label: string }> = [
  { key: "hasFinancialInterest", label: "Financial interest" },
  { key: "hasCloseRelationship", label: "Close relationship" },
  { key: "hasPriorEngagementConflict", label: "Prior engagement conflict" },
  { key: "hasProhibitedActivity", label: "Prohibited activity" },
  { key: "selfReviewThreat", label: "Self-review threat" },
  { key: "familiarityThreat", label: "Familiarity threat" },
  { key: "advocacyThreat", label: "Advocacy threat" },
  { key: "managementParticipationThreat", label: "Management participation threat" },
];
const TEAM_ROLES = ["PARTNER", "MANAGER", "SENIOR", "STAFF"];
const ASSERTIONS = [
  "EXISTENCE",
  "COMPLETENESS",
  "ACCURACY",
  "CUTOFF",
  "CLASSIFICATION",
  "RIGHTS_AND_OBLIGATIONS",
  "VALUATION",
  "PRESENTATION",
  "DISCLOSURE",
];
const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH"];

export default function EngagementDetailPage({ params }: { params: { clientId: string; engagementId: string } }) {
  const { clientId, engagementId } = params;
  const { user } = useAuth();

  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [e, r, p, ev, f] = await Promise.all([
        api<Engagement>(`/clients/${clientId}/engagements/${engagementId}`),
        api<Risk[]>(`/clients/${clientId}/engagements/${engagementId}/risks`),
        api<Procedure[]>(`/clients/${clientId}/engagements/${engagementId}/procedures`),
        api<Evidence[]>(`/clients/${clientId}/engagements/${engagementId}/evidence`),
        api<Finding[]>(`/clients/${clientId}/engagements/${engagementId}/findings`),
      ]);
      setEngagement(e);
      setRisks(r);
      setProcedures(p);
      setEvidence(ev);
      setFindings(f);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load engagement");
    }
  }

  useEffect(() => {
    load();
  }, [clientId, engagementId]);

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

  // --- Acceptance ------------------------------------------------------------
  function onAccept() {
    run(() => api(`/clients/${clientId}/engagements/${engagementId}/accept`, { method: "POST" }));
  }
  function onDecline() {
    run(() => api(`/clients/${clientId}/engagements/${engagementId}/decline`, { method: "POST" }));
  }

  // --- Team --------------------------------------------------------------
  const [teamForm, setTeamForm] = useState({ userId: "", role: "STAFF" });
  function onAddTeamMember(e: React.FormEvent) {
    e.preventDefault();
    run(() =>
      api(`/clients/${clientId}/engagements/${engagementId}/team`, {
        method: "POST",
        body: teamForm,
      }),
    ).then(() => setTeamForm({ userId: "", role: "STAFF" }));
  }

  // --- Independence --------------------------------------------------------
  const [showIndepForm, setShowIndepForm] = useState(false);
  const [indepForm, setIndepForm] = useState<Record<string, boolean>>({});
  const [indepNotes, setIndepNotes] = useState("");
  function onLogIndependence(e: React.FormEvent) {
    e.preventDefault();
    run(() =>
      api(`/clients/${clientId}/engagements/${engagementId}/independence-checks`, {
        method: "POST",
        body: { ...indepForm, notes: indepNotes || undefined },
      }),
    ).then(() => {
      setIndepForm({});
      setIndepNotes("");
      setShowIndepForm(false);
    });
  }
  const [resolveForm, setResolveForm] = useState<Record<string, { resolution: string; resolutionNotes: string }>>({});
  function onResolveIndependence(checkId: string) {
    const f = resolveForm[checkId];
    if (!f?.resolutionNotes) {
      setError("Resolution notes are required");
      return;
    }
    run(() =>
      api(`/clients/${clientId}/engagements/${engagementId}/independence-checks/${checkId}/resolve`, {
        method: "POST",
        body: f,
      }),
    );
  }

  // --- Risks ---------------------------------------------------------------
  const [showRiskForm, setShowRiskForm] = useState(false);
  const [riskForm, setRiskForm] = useState({
    description: "",
    category: "INHERENT",
    assertion: "",
    likelihood: "MEDIUM",
    impact: "MEDIUM",
    isSignificant: false,
    response: "",
  });
  function onCreateRisk(e: React.FormEvent) {
    e.preventDefault();
    run(() =>
      api(`/clients/${clientId}/engagements/${engagementId}/risks`, {
        method: "POST",
        body: { ...riskForm, assertion: riskForm.assertion || undefined, response: riskForm.response || undefined },
      }),
    ).then(() => {
      setRiskForm({ description: "", category: "INHERENT", assertion: "", likelihood: "MEDIUM", impact: "MEDIUM", isSignificant: false, response: "" });
      setShowRiskForm(false);
    });
  }

  // --- Procedures ------------------------------------------------------------
  const [showProcForm, setShowProcForm] = useState(false);
  const [procForm, setProcForm] = useState({
    riskId: "",
    assertion: "EXISTENCE",
    procedureType: "SUBSTANTIVE_TEST",
    description: "",
    sampleSize: "",
  });
  function onCreateProcedure(e: React.FormEvent) {
    e.preventDefault();
    run(() =>
      api(`/clients/${clientId}/engagements/${engagementId}/procedures`, {
        method: "POST",
        body: {
          ...procForm,
          riskId: procForm.riskId || undefined,
          sampleSize: procForm.sampleSize ? parseInt(procForm.sampleSize, 10) : undefined,
        },
      }),
    ).then(() => {
      setProcForm({ riskId: "", assertion: "EXISTENCE", procedureType: "SUBSTANTIVE_TEST", description: "", sampleSize: "" });
      setShowProcForm(false);
    });
  }
  const [procUpdate, setProcUpdate] = useState<Record<string, { status: string; conclusion: string }>>({});
  function onUpdateProcedure(procId: string) {
    const f = procUpdate[procId];
    if (!f) return;
    run(() =>
      api(`/clients/${clientId}/engagements/${engagementId}/procedures/${procId}`, {
        method: "PATCH",
        body: { status: f.status, conclusion: f.conclusion || undefined },
      }),
    );
  }

  // --- Evidence --------------------------------------------------------------
  const [showEvForm, setShowEvForm] = useState(false);
  const [evForm, setEvForm] = useState({ procedureId: "", findingId: "", description: "", evidenceType: "DOCUMENT" });
  function onCreateEvidence(e: React.FormEvent) {
    e.preventDefault();
    run(() =>
      api(`/clients/${clientId}/engagements/${engagementId}/evidence`, {
        method: "POST",
        body: {
          description: evForm.description,
          evidenceType: evForm.evidenceType,
          procedureId: evForm.procedureId || undefined,
          findingId: evForm.findingId || undefined,
        },
      }),
    ).then(() => {
      setEvForm({ procedureId: "", findingId: "", description: "", evidenceType: "DOCUMENT" });
      setShowEvForm(false);
    });
  }

  // --- Findings --------------------------------------------------------------
  const [showFindingForm, setShowFindingForm] = useState(false);
  const [findingForm, setFindingForm] = useState({
    procedureId: "",
    riskId: "",
    type: "EXCEPTION",
    assertion: "",
    description: "",
    amount: "",
    severity: "LOW",
    recommendation: "",
  });
  function onCreateFinding(e: React.FormEvent) {
    e.preventDefault();
    run(() =>
      api(`/clients/${clientId}/engagements/${engagementId}/findings`, {
        method: "POST",
        body: {
          ...findingForm,
          procedureId: findingForm.procedureId || undefined,
          riskId: findingForm.riskId || undefined,
          assertion: findingForm.assertion || undefined,
          amount: findingForm.amount ? parseFloat(findingForm.amount) : undefined,
          recommendation: findingForm.recommendation || undefined,
        },
      }),
    ).then(() => {
      setFindingForm({ procedureId: "", riskId: "", type: "EXCEPTION", assertion: "", description: "", amount: "", severity: "LOW", recommendation: "" });
      setShowFindingForm(false);
    });
  }
  const [findingUpdate, setFindingUpdate] = useState<Record<string, { status: string; managementResponse: string }>>({});
  function onUpdateFinding(findingId: string) {
    const f = findingUpdate[findingId];
    if (!f) return;
    run(() =>
      api(`/clients/${clientId}/engagements/${engagementId}/findings/${findingId}`, {
        method: "PATCH",
        body: { status: f.status, managementResponse: f.managementResponse || undefined },
      }),
    );
  }

  // --- Completion / conclusion / approval -------------------------------------
  function onStartCompletion() {
    run(() => api(`/clients/${clientId}/engagements/${engagementId}/completion/start`, { method: "POST" }));
  }
  function onCompletionItem(itemId: string, status: string) {
    run(() => api(`/clients/${clientId}/engagements/${engagementId}/completion/${itemId}`, { method: "PATCH", body: { status } }));
  }
  const [conclusionText, setConclusionText] = useState("");
  function onConclude(e: React.FormEvent) {
    e.preventDefault();
    run(() =>
      api(`/clients/${clientId}/engagements/${engagementId}/conclude`, { method: "POST", body: { conclusionText } }),
    ).then(() => setConclusionText(""));
  }
  function onApprove() {
    run(() => api(`/clients/${clientId}/engagements/${engagementId}/approve`, { method: "POST" }));
  }

  if (!engagement) {
    return (
      <div className="stack">
        <Link href={`/dashboard/clients/${clientId}/engagements`} className="muted">
          ← Engagements
        </Link>
        {error ? <div className="error">{error}</div> : <p className="muted">Loading...</p>}
      </div>
    );
  }

  const pendingItems = engagement.completionItems.filter((i) => i.status === "PENDING");
  const openExceptions = engagement.independenceChecks.filter((c) => c.status === "EXCEPTION" && c.resolution === "PENDING");
  const isOwnConclusion = user && engagement.concludedById === user.id;

  return (
    <div className="stack">
      <Link href={`/dashboard/clients/${clientId}/engagements`} className="muted">
        ← Engagements
      </Link>

      {error && <div className="error">{error}</div>}

      <div className="card stack">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <strong>{engagement.serviceType.replace("_", " ")} engagement</strong>
          <div className="row">
            <span className={`badge ${engagement.acceptanceStatus.toLowerCase()}`}>{engagement.acceptanceStatus}</span>
            <span className={`badge ${engagement.status.toLowerCase()}`}>{engagement.status.replace("_", " ")}</span>
            {engagement.independenceStatus && (
              <span className={`badge ${engagement.independenceStatus.toLowerCase()}`}>{engagement.independenceStatus}</span>
            )}
          </div>
        </div>
        <div className="muted">
          Period {new Date(engagement.periodStart).toLocaleDateString()} - {new Date(engagement.periodEnd).toLocaleDateString()}
          {engagement.materialityAmount && <> · Materiality {Number(engagement.materialityAmount).toLocaleString()}</>}
          {engagement.materialityBasis && <> ({engagement.materialityBasis})</>}
        </div>
        {engagement.scope && <div>{engagement.scope}</div>}
        <div className="muted">Created by {engagement.createdBy.firstName} {engagement.createdBy.lastName}</div>

        {engagement.acceptanceStatus === "PENDING" && (
          <div className="row">
            <button disabled={busy} onClick={onAccept}>Accept engagement</button>
            <button className="danger" disabled={busy} onClick={onDecline}>Decline</button>
          </div>
        )}
      </div>

      {/* Team */}
      <div className="card stack">
        <strong>Engagement team</strong>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {engagement.teamMembers.map((m) => (
              <tr key={m.id}>
                <td>{m.user.firstName} {m.user.lastName}</td>
                <td>{m.user.email}</td>
                <td>{m.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <form onSubmit={onAddTeamMember} className="row" style={{ alignItems: "flex-end" }}>
          <div className="stack" style={{ flex: 1 }}>
            <label>User ID</label>
            <input
              placeholder="Firm user's ID (see Firm → Users)"
              value={teamForm.userId}
              onChange={(e) => setTeamForm((f) => ({ ...f, userId: e.target.value }))}
              required
            />
          </div>
          <div className="stack">
            <label>Role</label>
            <select value={teamForm.role} onChange={(e) => setTeamForm((f) => ({ ...f, role: e.target.value }))}>
              {TEAM_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <button type="submit" disabled={busy}>Add to team</button>
        </form>
      </div>

      {/* Independence */}
      <div className="card stack">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <strong>Independence checks (SRS 36)</strong>
          <button className="secondary" onClick={() => setShowIndepForm((s) => !s)}>
            {showIndepForm ? "Cancel" : "+ Log independence check"}
          </button>
        </div>

        {showIndepForm && (
          <form onSubmit={onLogIndependence} className="stack">
            <div className="kpi-grid">
              {THREAT_FIELDS.map((t) => (
                <label key={t.key as string} className="row" style={{ fontWeight: 400 }}>
                  <input
                    type="checkbox"
                    checked={!!indepForm[t.key as string]}
                    onChange={(e) => setIndepForm((f) => ({ ...f, [t.key as string]: e.target.checked }))}
                  />
                  {t.label}
                </label>
              ))}
            </div>
            <div className="stack">
              <label>Notes</label>
              <textarea value={indepNotes} onChange={(e) => setIndepNotes(e.target.value)} rows={2} />
            </div>
            <button type="submit" disabled={busy}>Save independence check</button>
          </form>
        )}

        {engagement.independenceChecks.length === 0 ? (
          <p className="muted">No independence checks logged yet.</p>
        ) : (
          engagement.independenceChecks.map((c) => (
            <div key={c.id} className="card" style={{ background: "var(--bg)" }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className={`badge ${c.status.toLowerCase()}`}>{c.status}</span>
                <span className="muted">
                  Logged by {c.checkedBy.firstName} {c.checkedBy.lastName}
                </span>
              </div>
              <div className="muted">
                Threats flagged: {THREAT_FIELDS.filter((t) => c[t.key]).map((t) => t.label).join(", ") || "None"}
              </div>
              {c.notes && <div>{c.notes}</div>}
              {c.status === "EXCEPTION" && c.resolution === "PENDING" && (
                <div className="stack" style={{ marginTop: 8 }}>
                  {user && c.checkedBy.id === user.id && (
                    <div className="muted">
                      You logged this exception - it must be resolved by a different team member (SRS 55).
                    </div>
                  )}
                  <div className="row" style={{ alignItems: "flex-end" }}>
                    <div className="stack">
                      <label>Resolution</label>
                      <select
                        value={resolveForm[c.id]?.resolution ?? "SAFEGUARDED"}
                        onChange={(e) =>
                          setResolveForm((f) => ({ ...f, [c.id]: { resolution: e.target.value, resolutionNotes: f[c.id]?.resolutionNotes ?? "" } }))
                        }
                      >
                        <option value="SAFEGUARDED">Safeguarded</option>
                        <option value="DECLINED_ENGAGEMENT">Declined engagement</option>
                      </select>
                    </div>
                    <div className="stack" style={{ flex: 1 }}>
                      <label>Resolution notes</label>
                      <input
                        value={resolveForm[c.id]?.resolutionNotes ?? ""}
                        onChange={(e) =>
                          setResolveForm((f) => ({ ...f, [c.id]: { resolution: f[c.id]?.resolution ?? "SAFEGUARDED", resolutionNotes: e.target.value } }))
                        }
                      />
                    </div>
                    <button
                      className="secondary"
                      disabled={busy || (!!user && c.checkedBy.id === user.id)}
                      onClick={() => onResolveIndependence(c.id)}
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              )}
              {c.resolution !== "PENDING" && (
                <div className="muted" style={{ marginTop: 4 }}>
                  Resolved ({c.resolution}) by {c.resolvedBy?.firstName} {c.resolvedBy?.lastName}: {c.resolutionNotes}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Risk register */}
      <div className="card stack">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <strong>Risk register</strong>
          <button className="secondary" onClick={() => setShowRiskForm((s) => !s)}>{showRiskForm ? "Cancel" : "+ Add risk"}</button>
        </div>
        {showRiskForm && (
          <form onSubmit={onCreateRisk} className="stack">
            <div className="stack">
              <label>Description</label>
              <input value={riskForm.description} onChange={(e) => setRiskForm((f) => ({ ...f, description: e.target.value }))} required />
            </div>
            <div className="row" style={{ alignItems: "flex-end" }}>
              <div className="stack">
                <label>Category</label>
                <select value={riskForm.category} onChange={(e) => setRiskForm((f) => ({ ...f, category: e.target.value }))}>
                  {["INHERENT", "CONTROL", "DETECTION", "FRAUD"].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="stack">
                <label>Assertion</label>
                <select value={riskForm.assertion} onChange={(e) => setRiskForm((f) => ({ ...f, assertion: e.target.value }))}>
                  <option value="">None</option>
                  {ASSERTIONS.map((a) => <option key={a} value={a}>{a.replace(/_/g, " ")}</option>)}
                </select>
              </div>
              <div className="stack">
                <label>Likelihood</label>
                <select value={riskForm.likelihood} onChange={(e) => setRiskForm((f) => ({ ...f, likelihood: e.target.value }))}>
                  {RISK_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="stack">
                <label>Impact</label>
                <select value={riskForm.impact} onChange={(e) => setRiskForm((f) => ({ ...f, impact: e.target.value }))}>
                  {RISK_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <label className="row" style={{ fontWeight: 400 }}>
                <input type="checkbox" checked={riskForm.isSignificant} onChange={(e) => setRiskForm((f) => ({ ...f, isSignificant: e.target.checked }))} />
                Significant risk
              </label>
            </div>
            <div className="stack">
              <label>Planned response</label>
              <input value={riskForm.response} onChange={(e) => setRiskForm((f) => ({ ...f, response: e.target.value }))} />
            </div>
            <button type="submit" disabled={busy}>Add risk</button>
          </form>
        )}
        {risks.length === 0 ? (
          <p className="muted">No risks identified yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Category</th>
                <th>Assertion</th>
                <th>Likelihood / Impact</th>
                <th>Significant</th>
              </tr>
            </thead>
            <tbody>
              {risks.map((r) => (
                <tr key={r.id}>
                  <td>{r.description}</td>
                  <td>{r.category}</td>
                  <td>{r.assertion?.replace(/_/g, " ") ?? "-"}</td>
                  <td>{r.likelihood} / {r.impact}</td>
                  <td>{r.isSignificant ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Procedures */}
      <div className="card stack">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <strong>Audit procedures</strong>
          <button className="secondary" onClick={() => setShowProcForm((s) => !s)}>{showProcForm ? "Cancel" : "+ Add procedure"}</button>
        </div>
        {showProcForm && (
          <form onSubmit={onCreateProcedure} className="stack">
            <div className="stack">
              <label>Description</label>
              <input value={procForm.description} onChange={(e) => setProcForm((f) => ({ ...f, description: e.target.value }))} required />
            </div>
            <div className="row" style={{ alignItems: "flex-end" }}>
              <div className="stack">
                <label>Linked risk</label>
                <select value={procForm.riskId} onChange={(e) => setProcForm((f) => ({ ...f, riskId: e.target.value }))}>
                  <option value="">None</option>
                  {risks.map((r) => <option key={r.id} value={r.id}>{r.description.slice(0, 40)}</option>)}
                </select>
              </div>
              <div className="stack">
                <label>Assertion</label>
                <select value={procForm.assertion} onChange={(e) => setProcForm((f) => ({ ...f, assertion: e.target.value }))}>
                  {ASSERTIONS.map((a) => <option key={a} value={a}>{a.replace(/_/g, " ")}</option>)}
                </select>
              </div>
              <div className="stack">
                <label>Type</label>
                <select value={procForm.procedureType} onChange={(e) => setProcForm((f) => ({ ...f, procedureType: e.target.value }))}>
                  {["CONTROL_TEST", "SUBSTANTIVE_TEST", "ANALYTICAL_PROCEDURE"].map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                </select>
              </div>
              <div className="stack">
                <label>Sample size</label>
                <input type="number" min={1} value={procForm.sampleSize} onChange={(e) => setProcForm((f) => ({ ...f, sampleSize: e.target.value }))} />
              </div>
              <button type="submit" disabled={busy}>Add procedure</button>
            </div>
          </form>
        )}
        {procedures.length === 0 ? (
          <p className="muted">No procedures yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Assertion</th>
                <th>Type</th>
                <th>Status</th>
                <th>Conclusion</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {procedures.map((p) => (
                <tr key={p.id}>
                  <td>{p.description}{p.sampleSize ? ` (n=${p.sampleSize})` : ""}</td>
                  <td>{p.assertion.replace(/_/g, " ")}</td>
                  <td>{p.procedureType.replace(/_/g, " ")}</td>
                  <td><span className={`badge ${p.status.toLowerCase()}`}>{p.status.replace(/_/g, " ")}</span></td>
                  <td>{p.conclusion ?? "-"}</td>
                  <td>
                    {p.status !== "COMPLETED" && (
                      <div className="row">
                        <select
                          value={procUpdate[p.id]?.status ?? "IN_PROGRESS"}
                          onChange={(e) => setProcUpdate((f) => ({ ...f, [p.id]: { status: e.target.value, conclusion: f[p.id]?.conclusion ?? "" } }))}
                        >
                          <option value="IN_PROGRESS">In progress</option>
                          <option value="COMPLETED">Completed</option>
                        </select>
                        <input
                          placeholder="Conclusion"
                          value={procUpdate[p.id]?.conclusion ?? ""}
                          onChange={(e) => setProcUpdate((f) => ({ ...f, [p.id]: { status: f[p.id]?.status ?? "IN_PROGRESS", conclusion: e.target.value } }))}
                        />
                        <button className="secondary" disabled={busy} onClick={() => onUpdateProcedure(p.id)}>Save</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Evidence */}
      <div className="card stack">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <strong>Evidence</strong>
          <button className="secondary" onClick={() => setShowEvForm((s) => !s)}>{showEvForm ? "Cancel" : "+ Add evidence"}</button>
        </div>
        {showEvForm && (
          <form onSubmit={onCreateEvidence} className="row" style={{ alignItems: "flex-end" }}>
            <div className="stack" style={{ flex: 1 }}>
              <label>Description</label>
              <input value={evForm.description} onChange={(e) => setEvForm((f) => ({ ...f, description: e.target.value }))} required />
            </div>
            <div className="stack">
              <label>Type</label>
              <select value={evForm.evidenceType} onChange={(e) => setEvForm((f) => ({ ...f, evidenceType: e.target.value }))}>
                {["DOCUMENT", "CONFIRMATION", "OBSERVATION", "INQUIRY", "RECALCULATION", "EXTERNAL", "INTERNAL"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="stack">
              <label>Procedure</label>
              <select value={evForm.procedureId} onChange={(e) => setEvForm((f) => ({ ...f, procedureId: e.target.value }))}>
                <option value="">None</option>
                {procedures.map((p) => <option key={p.id} value={p.id}>{p.description.slice(0, 30)}</option>)}
              </select>
            </div>
            <button type="submit" disabled={busy}>Add</button>
          </form>
        )}
        {evidence.length === 0 ? (
          <p className="muted">No evidence recorded yet.</p>
        ) : (
          <table>
            <thead><tr><th>Description</th><th>Type</th></tr></thead>
            <tbody>
              {evidence.map((e) => (
                <tr key={e.id}><td>{e.description}</td><td>{e.evidenceType}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Findings */}
      <div className="card stack">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <strong>Findings</strong>
          <button className="secondary" onClick={() => setShowFindingForm((s) => !s)}>{showFindingForm ? "Cancel" : "+ Add finding"}</button>
        </div>
        {showFindingForm && (
          <form onSubmit={onCreateFinding} className="stack">
            <div className="stack">
              <label>Description</label>
              <input value={findingForm.description} onChange={(e) => setFindingForm((f) => ({ ...f, description: e.target.value }))} required />
            </div>
            <div className="row" style={{ alignItems: "flex-end" }}>
              <div className="stack">
                <label>Type</label>
                <select value={findingForm.type} onChange={(e) => setFindingForm((f) => ({ ...f, type: e.target.value }))}>
                  {["EXCEPTION", "MISSTATEMENT", "CONTROL_DEFICIENCY"].map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                </select>
              </div>
              <div className="stack">
                <label>Severity</label>
                <select value={findingForm.severity} onChange={(e) => setFindingForm((f) => ({ ...f, severity: e.target.value }))}>
                  {RISK_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="stack">
                <label>Amount</label>
                <input type="number" step="0.01" value={findingForm.amount} onChange={(e) => setFindingForm((f) => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="stack">
                <label>Linked risk</label>
                <select value={findingForm.riskId} onChange={(e) => setFindingForm((f) => ({ ...f, riskId: e.target.value }))}>
                  <option value="">None</option>
                  {risks.map((r) => <option key={r.id} value={r.id}>{r.description.slice(0, 30)}</option>)}
                </select>
              </div>
            </div>
            <div className="stack">
              <label>Recommendation</label>
              <input value={findingForm.recommendation} onChange={(e) => setFindingForm((f) => ({ ...f, recommendation: e.target.value }))} />
            </div>
            <button type="submit" disabled={busy}>Add finding</button>
          </form>
        )}
        {findings.length === 0 ? (
          <p className="muted">No findings recorded.</p>
        ) : (
          <table>
            <thead>
              <tr><th>Description</th><th>Type</th><th>Severity</th><th>Amount</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {findings.map((f) => (
                <tr key={f.id}>
                  <td>{f.description}</td>
                  <td>{f.type}</td>
                  <td>{f.severity}</td>
                  <td>{f.amount ? Number(f.amount).toLocaleString() : "-"}</td>
                  <td><span className={`badge ${f.status.toLowerCase()}`}>{f.status}</span></td>
                  <td>
                    {f.status === "OPEN" && (
                      <div className="row">
                        <select
                          value={findingUpdate[f.id]?.status ?? "RESOLVED"}
                          onChange={(e) => setFindingUpdate((u) => ({ ...u, [f.id]: { status: e.target.value, managementResponse: u[f.id]?.managementResponse ?? "" } }))}
                        >
                          <option value="RESOLVED">Resolved</option>
                          <option value="ACCEPTED">Accepted</option>
                        </select>
                        <input
                          placeholder="Management response"
                          value={findingUpdate[f.id]?.managementResponse ?? ""}
                          onChange={(e) => setFindingUpdate((u) => ({ ...u, [f.id]: { status: u[f.id]?.status ?? "RESOLVED", managementResponse: e.target.value } }))}
                        />
                        <button className="secondary" disabled={busy} onClick={() => onUpdateFinding(f.id)}>Save</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Completion / conclusion / approval */}
      <div className="card stack">
        <strong>Completion checklist (SRS 33)</strong>
        {engagement.completionItems.length === 0 ? (
          <button disabled={busy} onClick={onStartCompletion}>Start completion checklist</button>
        ) : (
          <table>
            <thead><tr><th>Item</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {engagement.completionItems.map((i) => (
                <tr key={i.id}>
                  <td>{i.item}</td>
                  <td><span className={`badge ${i.status.toLowerCase()}`}>{i.status.replace("_", " ")}</span></td>
                  <td>
                    {i.status === "PENDING" ? (
                      <div className="row">
                        <button className="secondary" disabled={busy} onClick={() => onCompletionItem(i.id, "COMPLETE")}>Mark complete</button>
                        <button className="secondary" disabled={busy} onClick={() => onCompletionItem(i.id, "NOT_APPLICABLE")}>N/A</button>
                      </div>
                    ) : (
                      <button className="secondary" disabled={busy} onClick={() => onCompletionItem(i.id, "PENDING")}>Reopen</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {openExceptions.length > 0 && (
          <div className="error">{openExceptions.length} independence exception(s) still unresolved.</div>
        )}

        {engagement.status !== "COMPLETED" && !engagement.concludedById && (
          <form onSubmit={onConclude} className="stack">
            <label>Conclusion</label>
            <textarea rows={3} value={conclusionText} onChange={(e) => setConclusionText(e.target.value)} required />
            <button type="submit" disabled={busy || pendingItems.length > 0}>
              {pendingItems.length > 0 ? `${pendingItems.length} checklist item(s) pending` : "Conclude engagement"}
            </button>
          </form>
        )}

        {engagement.concludedById && (
          <div className="stack">
            <div className="muted">
              Concluded by {engagement.concludedBy?.firstName} {engagement.concludedBy?.lastName}
            </div>
            <div>{engagement.conclusionText}</div>
            {engagement.approvedById ? (
              <div className="muted">
                Approved by {engagement.approvedBy?.firstName} {engagement.approvedBy?.lastName}
              </div>
            ) : (
              <div className="stack">
                {isOwnConclusion && (
                  <div className="muted">You concluded this engagement - it must be approved by someone else (SRS 55).</div>
                )}
                <button disabled={busy || !!isOwnConclusion} onClick={onApprove}>Approve conclusion</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
}
interface Run {
  id: string;
  periodLabel: string;
  payDate: string;
  status: string;
  totalGross: string;
  totalDeductions: string;
  totalNet: string;
}

export default function PayrollPage() {
  const { clientId = "" } = useParams<{ clientId: string }>();
  const [runs, setRuns] = useState<Run[] | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState({ periodLabel: "", payDate: new Date().toISOString().slice(0, 10) });

  const expenseAccounts = accounts.filter((a) => a.type === "EXPENSE");
  const liabilityAccounts = accounts.filter((a) => a.type === "LIABILITY");

  async function load() {
    try {
      const [r, a] = await Promise.all([
        api<Run[]>(`/clients/${clientId}/payroll-runs`),
        api<Account[]>(`/clients/${clientId}/accounts`),
      ]);
      setRuns(r);
      setAccounts(a);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load payroll runs");
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
      await api(`/clients/${clientId}/payroll-runs`, { method: "POST", body: form });
      setForm({ periodLabel: "", payDate: new Date().toISOString().slice(0, 10) });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create payroll run");
    } finally {
      setSubmitting(false);
    }
  }

  async function onPost(runId: string) {
    if (expenseAccounts.length === 0 || liabilityAccounts.length === 0) {
      setError("Salaries expense and payable accounts must exist in the chart of accounts");
      return;
    }
    const salariesExpenseAccountId = window.prompt(
      `Salaries expense account id?\n${expenseAccounts.map((a) => `${a.id} = ${a.code} ${a.name}`).join("\n")}`,
    );
    if (!salariesExpenseAccountId) return;
    const salariesPayableAccountId = window.prompt(
      `Salaries payable account id?\n${liabilityAccounts.map((a) => `${a.id} = ${a.code} ${a.name}`).join("\n")}`,
    );
    if (!salariesPayableAccountId) return;

    setBusyId(runId);
    setError(null);
    try {
      await api(`/clients/${clientId}/payroll-runs/${runId}/post`, {
        method: "POST",
        body: { salariesExpenseAccountId, salariesPayableAccountId },
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to post payroll run");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>Payroll</h2>
        <button onClick={() => setShowForm((s) => !s)}>{showForm ? "Cancel" : "+ New payroll run"}</button>
      </div>

      {showForm && (
        <form onSubmit={onCreate} className="card row" style={{ alignItems: "flex-end" }}>
          <div className="stack">
            <label>Period label</label>
            <input placeholder="e.g. 2026-02" value={form.periodLabel} onChange={(e) => setForm((f) => ({ ...f, periodLabel: e.target.value }))} required />
          </div>
          <div className="stack">
            <label>Pay date</label>
            <input type="date" value={form.payDate} onChange={(e) => setForm((f) => ({ ...f, payDate: e.target.value }))} required />
          </div>
          <p className="muted" style={{ maxWidth: 260 }}>Includes every active employee at their base salary. Line-level overrides aren't in this UI yet - use the API for allowances/deductions.</p>
          <button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create run"}</button>
        </form>
      )}

      {error && <div className="error">{error}</div>}

      <div className="card">
        {runs === null ? (
          <p className="muted">Loading...</p>
        ) : runs.length === 0 ? (
          <p className="muted">No payroll runs yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Period</th>
                <th>Pay date</th>
                <th>Gross</th>
                <th>Deductions</th>
                <th>Net</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td>{r.periodLabel}</td>
                  <td>{new Date(r.payDate).toLocaleDateString()}</td>
                  <td>{Number(r.totalGross).toFixed(2)}</td>
                  <td>{Number(r.totalDeductions).toFixed(2)}</td>
                  <td>{Number(r.totalNet).toFixed(2)}</td>
                  <td><span className={`badge ${r.status.toLowerCase()}`}>{r.status}</span></td>
                  <td>
                    {r.status === "DRAFT" && (
                      <button className="secondary" disabled={busyId === r.id} onClick={() => onPost(r.id)}>Post</button>
                    )}
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

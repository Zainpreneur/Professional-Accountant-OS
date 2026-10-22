import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

interface TaxPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}
interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
}
interface ZakatAdjustment {
  id: string;
  description: string;
  type: string;
  amount: string;
}
interface ZakatReturn {
  id: string;
  taxPeriod: TaxPeriod;
  equityAmount: string;
  netFixedAssetsAmount: string;
  additionsTotal: string;
  deductionsTotal: string;
  zakatBase: string;
  zakatRate: string;
  zakatDue: string;
  status: string;
  adjustments: ZakatAdjustment[];
}

export default function ZakatPage() {
  const { clientId = "" } = useParams<{ clientId: string }>();
  const [periods, setPeriods] = useState<TaxPeriod[]>([]);
  const [returns, setReturns] = useState<ZakatReturn[] | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [showPeriodForm, setShowPeriodForm] = useState(false);
  const [periodForm, setPeriodForm] = useState({ name: "", startDate: "", endDate: "" });
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [adjustmentTarget, setAdjustmentTarget] = useState<string | null>(null);
  const [adjustmentForm, setAdjustmentForm] = useState({ description: "", type: "ADDITION", amount: "" });

  const expenseAccounts = accounts.filter((a) => a.type === "EXPENSE");
  const liabilityAccounts = accounts.filter((a) => a.type === "LIABILITY");

  async function load() {
    try {
      const [p, r, a] = await Promise.all([
        api<TaxPeriod[]>(`/clients/${clientId}/tax-periods?periodType=ZAKAT`),
        api<ZakatReturn[]>(`/clients/${clientId}/zakat-returns`),
        api<Account[]>(`/clients/${clientId}/accounts`),
      ]);
      setPeriods(p);
      setReturns(r);
      setAccounts(a);
      if (p.length > 0 && !selectedPeriodId) setSelectedPeriodId(p[0].id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load Zakat data");
    }
  }

  useEffect(() => {
    load();
  }, [clientId]);

  async function onCreatePeriod(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api(`/clients/${clientId}/tax-periods`, { method: "POST", body: { periodType: "ZAKAT", ...periodForm } });
      setPeriodForm({ name: "", startDate: "", endDate: "" });
      setShowPeriodForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create tax period");
    }
  }

  async function onCreateReturn() {
    if (!selectedPeriodId) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/clients/${clientId}/zakat-returns`, { method: "POST", body: { taxPeriodId: selectedPeriodId } });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create Zakat return");
    } finally {
      setBusy(false);
    }
  }

  async function onAddAdjustment(e: React.FormEvent) {
    e.preventDefault();
    if (!adjustmentTarget) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/clients/${clientId}/zakat-returns/${adjustmentTarget}/adjustments`, {
        method: "POST",
        body: { ...adjustmentForm, amount: parseFloat(adjustmentForm.amount) || 0 },
      });
      setAdjustmentForm({ description: "", type: "ADDITION", amount: "" });
      setAdjustmentTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add adjustment");
    } finally {
      setBusy(false);
    }
  }

  async function onFile(id: string) {
    if (expenseAccounts.length === 0 || liabilityAccounts.length === 0) {
      setError("A Zakat expense account and a payable account must exist in the chart of accounts");
      return;
    }
    const expenseAccountId = window.prompt(`Zakat expense account id?\n${expenseAccounts.map((a) => `${a.id} = ${a.code} ${a.name}`).join("\n")}`);
    if (!expenseAccountId) return;
    const payableAccountId = window.prompt(`Zakat payable account id?\n${liabilityAccounts.map((a) => `${a.id} = ${a.code} ${a.name}`).join("\n")}`);
    if (!payableAccountId) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/clients/${clientId}/zakat-returns/${id}/file`, { method: "POST", body: { expenseAccountId, payableAccountId } });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to file Zakat return");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>Zakat</h2>
        <button onClick={() => setShowPeriodForm((s) => !s)}>{showPeriodForm ? "Cancel" : "+ New Zakat period"}</button>
      </div>

      {showPeriodForm && (
        <form onSubmit={onCreatePeriod} className="card row" style={{ alignItems: "flex-end" }}>
          <div className="stack">
            <label>Period name</label>
            <input placeholder="e.g. 2026" value={periodForm.name} onChange={(e) => setPeriodForm((f) => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="stack">
            <label>Start date</label>
            <input type="date" value={periodForm.startDate} onChange={(e) => setPeriodForm((f) => ({ ...f, startDate: e.target.value }))} required />
          </div>
          <div className="stack">
            <label>End date</label>
            <input type="date" value={periodForm.endDate} onChange={(e) => setPeriodForm((f) => ({ ...f, endDate: e.target.value }))} required />
          </div>
          <button type="submit">Create</button>
        </form>
      )}

      <div className="card row" style={{ alignItems: "flex-end", justifyContent: "space-between" }}>
        <div className="stack" style={{ flex: 1 }}>
          <label>Create return for period</label>
          <select value={selectedPeriodId} onChange={(e) => setSelectedPeriodId(e.target.value)}>
            <option value="">Select period</option>
            {periods.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <button className="secondary" disabled={busy || !selectedPeriodId} onClick={onCreateReturn}>Create Zakat return</button>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="stack">
        {returns === null ? (
          <p className="muted">Loading...</p>
        ) : returns.length === 0 ? (
          <p className="muted">No Zakat returns yet.</p>
        ) : (
          returns.map((r) => (
            <div className="card stack" key={r.id}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <strong>{r.taxPeriod.name}</strong>
                <span className={`badge ${r.status.toLowerCase()}`}>{r.status}</span>
              </div>
              <div className="kpi-grid">
                <div className="kpi"><div className="value">{Number(r.equityAmount).toFixed(2)}</div><div className="label">Equity</div></div>
                <div className="kpi"><div className="value">{Number(r.netFixedAssetsAmount).toFixed(2)}</div><div className="label">Net fixed assets</div></div>
                <div className="kpi"><div className="value">{Number(r.additionsTotal).toFixed(2)}</div><div className="label">Additions</div></div>
                <div className="kpi"><div className="value">{Number(r.deductionsTotal).toFixed(2)}</div><div className="label">Deductions</div></div>
                <div className="kpi"><div className="value">{Number(r.zakatBase).toFixed(2)}</div><div className="label">Zakat base</div></div>
                <div className="kpi"><div className="value">{Number(r.zakatDue).toFixed(2)}</div><div className="label">Zakat due ({Number(r.zakatRate)}%)</div></div>
              </div>

              {r.adjustments.length > 0 && (
                <table>
                  <thead><tr><th>Description</th><th>Type</th><th>Amount</th></tr></thead>
                  <tbody>
                    {r.adjustments.map((a) => (
                      <tr key={a.id}><td>{a.description}</td><td>{a.type}</td><td>{Number(a.amount).toFixed(2)}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}

              {r.status === "DRAFT" && (
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <button className="secondary" onClick={() => setAdjustmentTarget(adjustmentTarget === r.id ? null : r.id)}>
                    {adjustmentTarget === r.id ? "Cancel" : "+ Add adjustment"}
                  </button>
                  <button disabled={busy} onClick={() => onFile(r.id)}>File</button>
                </div>
              )}

              {adjustmentTarget === r.id && (
                <form onSubmit={onAddAdjustment} className="row" style={{ alignItems: "flex-end" }}>
                  <input placeholder="Description" value={adjustmentForm.description} onChange={(e) => setAdjustmentForm((f) => ({ ...f, description: e.target.value }))} required />
                  <select value={adjustmentForm.type} onChange={(e) => setAdjustmentForm((f) => ({ ...f, type: e.target.value }))}>
                    <option value="ADDITION">Addition</option>
                    <option value="DEDUCTION">Deduction</option>
                  </select>
                  <input type="number" step="0.01" placeholder="Amount" value={adjustmentForm.amount} onChange={(e) => setAdjustmentForm((f) => ({ ...f, amount: e.target.value }))} required />
                  <button type="submit" disabled={busy}>Add</button>
                </form>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

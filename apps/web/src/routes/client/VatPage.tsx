import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

interface TaxPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  dueDate: string;
}
interface Account {
  id: string;
  code: string;
  name: string;
}
interface VatReturn {
  id: string;
  taxPeriod: TaxPeriod;
  outputVat: string;
  inputVat: string;
  netVatDue: string;
  status: string;
}

export default function VatPage() {
  const { clientId = "" } = useParams<{ clientId: string }>();
  const [periods, setPeriods] = useState<TaxPeriod[]>([]);
  const [returns, setReturns] = useState<VatReturn[] | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [showPeriodForm, setShowPeriodForm] = useState(false);
  const [periodForm, setPeriodForm] = useState({ name: "", startDate: "", endDate: "" });
  const [selectedPeriodId, setSelectedPeriodId] = useState("");

  async function load() {
    try {
      const [p, r, a] = await Promise.all([
        api<TaxPeriod[]>(`/clients/${clientId}/tax-periods?periodType=VAT`),
        api<VatReturn[]>(`/clients/${clientId}/vat-returns`),
        api<Account[]>(`/clients/${clientId}/accounts`),
      ]);
      setPeriods(p);
      setReturns(r);
      setAccounts(a);
      if (p.length > 0 && !selectedPeriodId) setSelectedPeriodId(p[0].id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load VAT data");
    }
  }

  useEffect(() => {
    load();
  }, [clientId]);

  async function onCreatePeriod(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api(`/clients/${clientId}/tax-periods`, { method: "POST", body: { periodType: "VAT", ...periodForm } });
      setPeriodForm({ name: "", startDate: "", endDate: "" });
      setShowPeriodForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create tax period");
    }
  }

  async function onGenerate() {
    if (!selectedPeriodId) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/clients/${clientId}/vat-returns`, { method: "POST", body: { taxPeriodId: selectedPeriodId } });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to generate VAT return");
    } finally {
      setBusy(false);
    }
  }

  async function onFile(id: string) {
    if (accounts.length === 0) return;
    const payableAccountId = window.prompt(
      `Settlement account id (payable if net due, receivable if refundable)?\n${accounts.map((a) => `${a.id} = ${a.code} ${a.name}`).join("\n")}`,
    );
    if (!payableAccountId) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/clients/${clientId}/vat-returns/${id}/file`, { method: "POST", body: { payableAccountId } });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to file VAT return");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>VAT</h2>
        <button onClick={() => setShowPeriodForm((s) => !s)}>{showPeriodForm ? "Cancel" : "+ New VAT period"}</button>
      </div>

      {showPeriodForm && (
        <form onSubmit={onCreatePeriod} className="card row" style={{ alignItems: "flex-end" }}>
          <div className="stack">
            <label>Period name</label>
            <input placeholder="e.g. 2026-Q1" value={periodForm.name} onChange={(e) => setPeriodForm((f) => ({ ...f, name: e.target.value }))} required />
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
          <label>Generate return for period</label>
          <select value={selectedPeriodId} onChange={(e) => setSelectedPeriodId(e.target.value)}>
            <option value="">Select period</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({new Date(p.startDate).toLocaleDateString()} - {new Date(p.endDate).toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>
        <button className="secondary" disabled={busy || !selectedPeriodId} onClick={onGenerate}>
          Generate VAT return
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="card">
        {returns === null ? (
          <p className="muted">Loading...</p>
        ) : returns.length === 0 ? (
          <p className="muted">No VAT returns yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Period</th>
                <th>Output VAT</th>
                <th>Input VAT</th>
                <th>Net due</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {returns.map((r) => (
                <tr key={r.id}>
                  <td>{r.taxPeriod.name}</td>
                  <td>{Number(r.outputVat).toFixed(2)}</td>
                  <td>{Number(r.inputVat).toFixed(2)}</td>
                  <td>{Number(r.netVatDue).toFixed(2)}</td>
                  <td><span className={`badge ${r.status.toLowerCase()}`}>{r.status}</span></td>
                  <td>
                    {r.status === "DRAFT" && (
                      <button className="secondary" disabled={busy} onClick={() => onFile(r.id)}>File</button>
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

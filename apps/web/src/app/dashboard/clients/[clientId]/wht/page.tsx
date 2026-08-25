"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

interface TaxPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}
interface Supplier {
  id: string;
  code: string;
  name: string;
  whtCategoryCode: string | null;
}
interface WhtReturn {
  id: string;
  taxPeriod: TaxPeriod;
  totalWht: string;
  breakdown: Array<{ categoryCode: string; amount: number }>;
  status: string;
}
interface CalcResult {
  applicable: boolean;
  categoryCode?: string;
  categoryName?: string;
  rate?: number;
  whtAmount: number;
  netAmount: number;
}

const WHT_CATEGORIES = ["SERVICES", "ROYALTIES", "MANAGEMENT_FEES", "RENT", "DIVIDENDS", "INTEREST"];

export default function WhtPage({ params }: { params: { clientId: string } }) {
  const { clientId } = params;
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [periods, setPeriods] = useState<TaxPeriod[]>([]);
  const [returns, setReturns] = useState<WhtReturn[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [calcForm, setCalcForm] = useState({ supplierId: "", amount: "", date: new Date().toISOString().slice(0, 10) });
  const [calcResult, setCalcResult] = useState<CalcResult | null>(null);

  const [showPeriodForm, setShowPeriodForm] = useState(false);
  const [periodForm, setPeriodForm] = useState({ name: "", startDate: "", endDate: "" });
  const [selectedPeriodId, setSelectedPeriodId] = useState("");

  async function load() {
    try {
      const [s, p, r] = await Promise.all([
        api<Supplier[]>(`/clients/${clientId}/suppliers`),
        api<TaxPeriod[]>(`/clients/${clientId}/tax-periods?periodType=WHT`),
        api<WhtReturn[]>(`/clients/${clientId}/wht-returns`),
      ]);
      setSuppliers(s);
      setPeriods(p);
      setReturns(r);
      if (p.length > 0 && !selectedPeriodId) setSelectedPeriodId(p[0].id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load WHT data");
    }
  }

  useEffect(() => {
    load();
  }, [clientId]);

  async function onSetCategory(supplierId: string, whtCategoryCode: string) {
    const supplier = suppliers.find((s) => s.id === supplierId);
    if (!supplier) return;
    setError(null);
    try {
      await api(`/clients/${clientId}/suppliers/${supplierId}`, {
        method: "PATCH",
        body: { code: supplier.code, name: supplier.name, whtCategoryCode: whtCategoryCode || undefined },
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update supplier WHT category");
    }
  }

  async function onCalculate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCalcResult(null);
    try {
      const result = await api<CalcResult>(`/clients/${clientId}/wht/calculate`, {
        method: "POST",
        body: { supplierId: calcForm.supplierId, amount: parseFloat(calcForm.amount) || 0, date: calcForm.date },
      });
      setCalcResult(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to calculate WHT");
    }
  }

  async function onCreatePeriod(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api(`/clients/${clientId}/tax-periods`, { method: "POST", body: { periodType: "WHT", ...periodForm } });
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
      await api(`/clients/${clientId}/wht-returns`, { method: "POST", body: { taxPeriodId: selectedPeriodId } });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to generate WHT return");
    } finally {
      setBusy(false);
    }
  }

  async function onFile(id: string) {
    setBusy(true);
    setError(null);
    try {
      await api(`/clients/${clientId}/wht-returns/${id}/file`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to file WHT return");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <h2 style={{ fontSize: 16, margin: 0 }}>Withholding tax</h2>
      {error && <div className="error">{error}</div>}

      <div className="card stack">
        <strong>Supplier WHT categories</strong>
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>WHT category</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id}>
                <td>{s.code}</td>
                <td>{s.name}</td>
                <td>
                  <select value={s.whtCategoryCode ?? ""} onChange={(e) => onSetCategory(s.id, e.target.value)}>
                    <option value="">None</option>
                    {WHT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={onCalculate} className="card row" style={{ alignItems: "flex-end" }}>
        <strong style={{ width: "100%" }}>Calculate WHT</strong>
        <select value={calcForm.supplierId} onChange={(e) => setCalcForm((f) => ({ ...f, supplierId: e.target.value }))} required>
          <option value="">Supplier</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
        </select>
        <input type="number" step="0.01" placeholder="Amount" value={calcForm.amount} onChange={(e) => setCalcForm((f) => ({ ...f, amount: e.target.value }))} required />
        <input type="date" value={calcForm.date} onChange={(e) => setCalcForm((f) => ({ ...f, date: e.target.value }))} required />
        <button type="submit">Calculate</button>
      </form>
      {calcResult && (
        <div className="card muted">
          {calcResult.applicable ? (
            <>Category: {calcResult.categoryName} ({calcResult.rate}%) — WHT: {calcResult.whtAmount.toFixed(2)}, net to supplier: {calcResult.netAmount.toFixed(2)}</>
          ) : (
            <>No WHT category set for this supplier - full amount payable.</>
          )}
        </div>
      )}

      <div className="row" style={{ justifyContent: "space-between" }}>
        <h3 style={{ fontSize: 14, margin: 0 }}>WHT returns</h3>
        <button onClick={() => setShowPeriodForm((s) => !s)}>{showPeriodForm ? "Cancel" : "+ New WHT period"}</button>
      </div>

      {showPeriodForm && (
        <form onSubmit={onCreatePeriod} className="card row" style={{ alignItems: "flex-end" }}>
          <div className="stack">
            <label>Period name</label>
            <input placeholder="e.g. 2026-08" value={periodForm.name} onChange={(e) => setPeriodForm((f) => ({ ...f, name: e.target.value }))} required />
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
            {periods.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <button className="secondary" disabled={busy || !selectedPeriodId} onClick={onGenerate}>Generate WHT return</button>
      </div>

      <div className="card">
        {returns === null ? (
          <p className="muted">Loading...</p>
        ) : returns.length === 0 ? (
          <p className="muted">No WHT returns yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Period</th>
                <th>Breakdown</th>
                <th>Total WHT</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {returns.map((r) => (
                <tr key={r.id}>
                  <td>{r.taxPeriod.name}</td>
                  <td>{r.breakdown.map((b) => `${b.categoryCode}: ${b.amount.toFixed(2)}`).join(", ")}</td>
                  <td>{Number(r.totalWht).toFixed(2)}</td>
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

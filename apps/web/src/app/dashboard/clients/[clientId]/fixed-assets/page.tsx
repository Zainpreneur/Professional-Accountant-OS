"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
}
interface Asset {
  id: string;
  assetCode: string;
  name: string;
  acquisitionDate: string;
  acquisitionCost: string;
  accumulatedDepreciation: string;
  usefulLifeMonths: number;
  status: string;
}

export default function FixedAssetsPage({ params }: { params: { clientId: string } }) {
  const { clientId } = params;
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [depRunning, setDepRunning] = useState(false);

  const [form, setForm] = useState({
    assetCode: "",
    name: "",
    acquisitionDate: new Date().toISOString().slice(0, 10),
    acquisitionCost: "",
    salvageValue: "0",
    usefulLifeMonths: "60",
    assetAccountId: "",
    depreciationExpenseAccountId: "",
    accumulatedDepreciationAccountId: "",
    fundingAccountId: "",
  });
  const [depPeriod, setDepPeriod] = useState({ periodLabel: "", runDate: new Date().toISOString().slice(0, 10) });

  const assetAccounts = accounts.filter((a) => a.type === "ASSET");
  const expenseAccounts = accounts.filter((a) => a.type === "EXPENSE");

  async function load() {
    try {
      const [a, acc] = await Promise.all([
        api<Asset[]>(`/clients/${clientId}/fixed-assets`),
        api<Account[]>(`/clients/${clientId}/accounts`),
      ]);
      setAssets(a);
      setAccounts(acc);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load fixed assets");
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
      await api(`/clients/${clientId}/fixed-assets`, {
        method: "POST",
        body: {
          ...form,
          acquisitionCost: parseFloat(form.acquisitionCost) || 0,
          salvageValue: parseFloat(form.salvageValue) || 0,
          usefulLifeMonths: parseInt(form.usefulLifeMonths, 10) || 1,
        },
      });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create asset");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDispose(assetId: string) {
    const proceeds = window.prompt("Disposal proceeds (SAR)?");
    if (proceeds === null) return;
    const cashAccountId = window.prompt(
      `Cash/bank account id to receive proceeds?\nOptions:\n${assetAccounts.map((a) => `${a.id} = ${a.code} ${a.name}`).join("\n")}`,
    );
    if (!cashAccountId) return;
    setBusyId(assetId);
    setError(null);
    try {
      await api(`/clients/${clientId}/fixed-assets/${assetId}/dispose`, {
        method: "POST",
        body: { disposalDate: new Date().toISOString().slice(0, 10), disposalProceeds: parseFloat(proceeds) || 0, cashAccountId },
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to dispose asset");
    } finally {
      setBusyId(null);
    }
  }

  async function onRunDepreciation(e: React.FormEvent) {
    e.preventDefault();
    setDepRunning(true);
    setError(null);
    setMessage(null);
    try {
      const run = await api<{ totalAmount: number }>(`/clients/${clientId}/depreciation-runs`, { method: "POST", body: depPeriod });
      setMessage(`Depreciation run posted: SAR ${Number(run.totalAmount).toFixed(2)}`);
      setDepPeriod({ periodLabel: "", runDate: new Date().toISOString().slice(0, 10) });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to run depreciation");
    } finally {
      setDepRunning(false);
    }
  }

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>Fixed assets</h2>
        <button onClick={() => setShowForm((s) => !s)}>{showForm ? "Cancel" : "+ Acquire asset"}</button>
      </div>

      {showForm && (
        <form onSubmit={onCreate} className="card stack">
          <div className="row">
            <div className="stack">
              <label>Asset code</label>
              <input value={form.assetCode} onChange={(e) => setForm((f) => ({ ...f, assetCode: e.target.value }))} required />
            </div>
            <div className="stack" style={{ flex: 1 }}>
              <label>Name</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="stack">
              <label>Acquisition date</label>
              <input type="date" value={form.acquisitionDate} onChange={(e) => setForm((f) => ({ ...f, acquisitionDate: e.target.value }))} required />
            </div>
          </div>
          <div className="row">
            <div className="stack">
              <label>Acquisition cost</label>
              <input type="number" step="0.01" value={form.acquisitionCost} onChange={(e) => setForm((f) => ({ ...f, acquisitionCost: e.target.value }))} required />
            </div>
            <div className="stack">
              <label>Salvage value</label>
              <input type="number" step="0.01" value={form.salvageValue} onChange={(e) => setForm((f) => ({ ...f, salvageValue: e.target.value }))} />
            </div>
            <div className="stack">
              <label>Useful life (months)</label>
              <input type="number" value={form.usefulLifeMonths} onChange={(e) => setForm((f) => ({ ...f, usefulLifeMonths: e.target.value }))} required />
            </div>
          </div>
          <div className="row">
            <div className="stack" style={{ flex: 1 }}>
              <label>Asset account</label>
              <select value={form.assetAccountId} onChange={(e) => setForm((f) => ({ ...f, assetAccountId: e.target.value }))} required>
                <option value="">Select</option>
                {assetAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                ))}
              </select>
            </div>
            <div className="stack" style={{ flex: 1 }}>
              <label>Depreciation expense account</label>
              <select value={form.depreciationExpenseAccountId} onChange={(e) => setForm((f) => ({ ...f, depreciationExpenseAccountId: e.target.value }))} required>
                <option value="">Select</option>
                {expenseAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="row">
            <div className="stack" style={{ flex: 1 }}>
              <label>Accumulated depreciation account</label>
              <select value={form.accumulatedDepreciationAccountId} onChange={(e) => setForm((f) => ({ ...f, accumulatedDepreciationAccountId: e.target.value }))} required>
                <option value="">Select</option>
                {assetAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                ))}
              </select>
            </div>
            <div className="stack" style={{ flex: 1 }}>
              <label>Funding account (paid from)</label>
              <select value={form.fundingAccountId} onChange={(e) => setForm((f) => ({ ...f, fundingAccountId: e.target.value }))} required>
                <option value="">Select</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                ))}
              </select>
            </div>
          </div>
          {error && <div className="error">{error}</div>}
          <div>
            <button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Acquire"}</button>
          </div>
        </form>
      )}

      <form onSubmit={onRunDepreciation} className="card row" style={{ alignItems: "flex-end" }}>
        <div className="stack">
          <label>Depreciation period label</label>
          <input placeholder="e.g. 2026-02" value={depPeriod.periodLabel} onChange={(e) => setDepPeriod((d) => ({ ...d, periodLabel: e.target.value }))} required />
        </div>
        <div className="stack">
          <label>Run date</label>
          <input type="date" value={depPeriod.runDate} onChange={(e) => setDepPeriod((d) => ({ ...d, runDate: e.target.value }))} required />
        </div>
        <button type="submit" className="secondary" disabled={depRunning}>
          {depRunning ? "Running..." : "Run depreciation for all active assets"}
        </button>
      </form>

      {message && <div className="muted">{message}</div>}
      {!showForm && error && <div className="error">{error}</div>}

      <div className="card">
        {assets === null ? (
          <p className="muted">Loading...</p>
        ) : assets.length === 0 ? (
          <p className="muted">No fixed assets yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Acquired</th>
                <th>Cost</th>
                <th>Accum. depreciation</th>
                <th>Net book value</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.id}>
                  <td>{a.assetCode}</td>
                  <td>{a.name}</td>
                  <td>{new Date(a.acquisitionDate).toLocaleDateString()}</td>
                  <td>{Number(a.acquisitionCost).toFixed(2)}</td>
                  <td>{Number(a.accumulatedDepreciation).toFixed(2)}</td>
                  <td>{(Number(a.acquisitionCost) - Number(a.accumulatedDepreciation)).toFixed(2)}</td>
                  <td>
                    <span className={`badge ${a.status.toLowerCase()}`}>{a.status}</span>
                  </td>
                  <td>
                    {a.status === "ACTIVE" && (
                      <button className="danger" disabled={busyId === a.id} onClick={() => onDispose(a.id)}>
                        Dispose
                      </button>
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

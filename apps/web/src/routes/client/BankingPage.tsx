import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

interface Account {
  id: string;
  code: string;
  name: string;
  controlAccountType: string | null;
}
interface StatementLine {
  id: string;
  date: string;
  description: string;
  amount: string;
  reference: string | null;
}
interface JournalLineRow {
  id: string;
  debit: string;
  credit: string;
  description: string | null;
  journal: { journalNumber: string; date: string; description: string | null };
}
interface Reconciliation {
  id: string;
  statementDate: string;
  statementEndingBalance: string;
  status: string;
}

export default function BankingPage() {
  const { clientId = "" } = useParams<{ clientId: string }>();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [bankAccountId, setBankAccountId] = useState("");
  const [statementLines, setStatementLines] = useState<StatementLine[]>([]);
  const [journalLines, setJournalLines] = useState<JournalLineRow[]>([]);
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
  const [selectedStatementLine, setSelectedStatementLine] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recForm, setRecForm] = useState({ statementDate: new Date().toISOString().slice(0, 10), statementEndingBalance: "" });

  const bankAccounts = accounts.filter((a) => a.controlAccountType === "BANK" || a.controlAccountType === "CASH");

  async function loadAccounts() {
    try {
      const acc = await api<Account[]>(`/clients/${clientId}/accounts`);
      setAccounts(acc);
      const banks = acc.filter((a) => a.controlAccountType === "BANK" || a.controlAccountType === "CASH");
      if (banks.length > 0 && !bankAccountId) setBankAccountId(banks[0].id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load accounts");
    }
  }

  async function loadForBankAccount() {
    if (!bankAccountId) return;
    try {
      const [unmatched, recs] = await Promise.all([
        api<{ statementLines: StatementLine[]; journalLines: JournalLineRow[] }>(
          `/clients/${clientId}/banking/unmatched?bankAccountId=${bankAccountId}`,
        ),
        api<Reconciliation[]>(`/clients/${clientId}/banking/reconciliations?bankAccountId=${bankAccountId}`),
      ]);
      setStatementLines(unmatched.statementLines);
      setJournalLines(unmatched.journalLines);
      setReconciliations(recs);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load bank reconciliation data");
    }
  }

  useEffect(() => {
    loadAccounts();
  }, [clientId]);

  useEffect(() => {
    loadForBankAccount();
  }, [clientId, bankAccountId]);

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !bankAccountId) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
      const token = window.localStorage.getItem("accountant_os_token");
      const form = new FormData();
      form.append("file", file);
      form.append("bankAccountId", bankAccountId);
      const res = await fetch(`${API_URL}/api/v1/clients/${clientId}/banking/statement-imports`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Import failed");
      }
      const result = await res.json();
      setMessage(`Imported ${result.lines.length} statement line(s).`);
      await loadForBankAccount();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  async function onAutoMatch() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await api<{ matchedCount: number; remainingUnmatched: number }>(`/clients/${clientId}/banking/auto-match`, {
        method: "POST",
        body: { bankAccountId },
      });
      setMessage(`Auto-matched ${result.matchedCount} line(s); ${result.remainingUnmatched} still unmatched.`);
      await loadForBankAccount();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Auto-match failed");
    } finally {
      setBusy(false);
    }
  }

  async function onManualMatch(journalLineId: string) {
    if (!selectedStatementLine) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/clients/${clientId}/banking/match`, {
        method: "POST",
        body: { statementLineId: selectedStatementLine, journalLineId },
      });
      setSelectedStatementLine(null);
      await loadForBankAccount();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Match failed");
    } finally {
      setBusy(false);
    }
  }

  async function onCreateTransaction(lineId: string) {
    const description = window.prompt("Description for this transaction?");
    if (!description) return;
    const offsetAccountId = window.prompt(
      `Offset account id?\n${accounts.map((a) => `${a.id} = ${a.code} ${a.name}`).join("\n")}`,
    );
    if (!offsetAccountId) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/clients/${clientId}/banking/statement-lines/${lineId}/create-transaction`, {
        method: "POST",
        body: { description, offsetAccountId },
      });
      await loadForBankAccount();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create transaction");
    } finally {
      setBusy(false);
    }
  }

  async function onCompleteReconciliation(id: string) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const summary = await api<{ bookBalance: number; statementEndingBalance: number; difference: number }>(
        `/clients/${clientId}/banking/reconciliations/${id}/summary`,
      );
      if (!window.confirm(`Book balance ${summary.bookBalance.toFixed(2)} vs statement ${summary.statementEndingBalance.toFixed(2)} (difference ${summary.difference.toFixed(2)}). Mark completed?`)) {
        return;
      }
      await api(`/clients/${clientId}/banking/reconciliations/${id}/complete`, { method: "POST" });
      setMessage("Reconciliation completed.");
      await loadForBankAccount();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to complete reconciliation");
    } finally {
      setBusy(false);
    }
  }

  async function onCreateReconciliation(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(`/clients/${clientId}/banking/reconciliations`, {
        method: "POST",
        body: { bankAccountId, statementDate: recForm.statementDate, statementEndingBalance: parseFloat(recForm.statementEndingBalance) || 0 },
      });
      setRecForm({ statementDate: new Date().toISOString().slice(0, 10), statementEndingBalance: "" });
      await loadForBankAccount();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to start reconciliation");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>Bank reconciliation</h2>
        <select value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)}>
          {bankAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
        </select>
      </div>

      {error && <div className="error">{error}</div>}
      {message && <div className="muted">{message}</div>}

      <div className="card row" style={{ justifyContent: "space-between" }}>
        <div className="stack">
          <label>Import statement (CSV: date, description, amount, reference)</label>
          <input type="file" accept=".csv,text/csv" onChange={onImport} disabled={busy || !bankAccountId} />
        </div>
        <button className="secondary" onClick={onAutoMatch} disabled={busy || !bankAccountId}>
          Auto-match
        </button>
      </div>

      <div className="row" style={{ alignItems: "flex-start" }}>
        <div className="card stack" style={{ flex: 1 }}>
          <strong>Unmatched statement lines ({statementLines.length})</strong>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {statementLines.map((l) => (
                <tr key={l.id} style={{ background: selectedStatementLine === l.id ? "#eef4f9" : undefined }}>
                  <td>{new Date(l.date).toLocaleDateString()}</td>
                  <td>{l.description}</td>
                  <td>{Number(l.amount).toFixed(2)}</td>
                  <td className="row">
                    <button
                      className="secondary"
                      onClick={() => setSelectedStatementLine(selectedStatementLine === l.id ? null : l.id)}
                    >
                      {selectedStatementLine === l.id ? "Cancel" : "Match to..."}
                    </button>
                    <button className="secondary" onClick={() => onCreateTransaction(l.id)} disabled={busy}>
                      New transaction
                    </button>
                  </td>
                </tr>
              ))}
              {statementLines.length === 0 && (
                <tr><td colSpan={4} className="muted">No unmatched statement lines.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card stack" style={{ flex: 1 }}>
          <strong>Unmatched GL lines on this account ({journalLines.length})</strong>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Journal</th>
                <th>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {journalLines.map((jl) => (
                <tr key={jl.id}>
                  <td>{new Date(jl.journal.date).toLocaleDateString()}</td>
                  <td>{jl.journal.journalNumber} - {jl.description ?? jl.journal.description}</td>
                  <td>{(Number(jl.debit) - Number(jl.credit)).toFixed(2)}</td>
                  <td>
                    {selectedStatementLine && (
                      <button onClick={() => onManualMatch(jl.id)} disabled={busy}>Match</button>
                    )}
                  </td>
                </tr>
              ))}
              {journalLines.length === 0 && (
                <tr><td colSpan={4} className="muted">No unmatched GL lines.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <form onSubmit={onCreateReconciliation} className="card row" style={{ alignItems: "flex-end" }}>
        <div className="stack">
          <label>Statement date</label>
          <input type="date" value={recForm.statementDate} onChange={(e) => setRecForm((f) => ({ ...f, statementDate: e.target.value }))} required />
        </div>
        <div className="stack">
          <label>Statement ending balance</label>
          <input type="number" step="0.01" value={recForm.statementEndingBalance} onChange={(e) => setRecForm((f) => ({ ...f, statementEndingBalance: e.target.value }))} required />
        </div>
        <button type="submit" className="secondary" disabled={busy}>Start reconciliation session</button>
      </form>

      <div className="card">
        <strong>Reconciliation sessions</strong>
        <table>
          <thead>
            <tr>
              <th>Statement date</th>
              <th>Statement balance</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {reconciliations.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.statementDate).toLocaleDateString()}</td>
                <td>{Number(r.statementEndingBalance).toFixed(2)}</td>
                <td><span className={`badge ${r.status.toLowerCase().replace("_", "-")}`}>{r.status}</span></td>
                <td>
                  {r.status === "IN_PROGRESS" && (
                    <button className="secondary" disabled={busy} onClick={() => onCompleteReconciliation(r.id)}>
                      Review &amp; complete
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {reconciliations.length === 0 && (
              <tr><td colSpan={4} className="muted">No reconciliation sessions yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

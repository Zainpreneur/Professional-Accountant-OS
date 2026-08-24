"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
}
interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  controlAccountType: string | null;
}
interface Claim {
  id: string;
  claimNumber: string;
  date: string;
  status: string;
  totalAmount: string;
  employee: Employee;
}

type DraftLine = { description: string; date: string; amount: string; categoryAccountId: string };
const emptyLine = (): DraftLine => ({ description: "", date: new Date().toISOString().slice(0, 10), amount: "", categoryAccountId: "" });

export default function ExpensesPage({ params }: { params: { clientId: string } }) {
  const { clientId } = params;
  const [claims, setClaims] = useState<Claim[] | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [employeeId, setEmployeeId] = useState("");
  const [claimNumber, setClaimNumber] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);

  const expenseAccounts = accounts.filter((a) => a.type === "EXPENSE");
  const cashAccounts = accounts.filter((a) => a.controlAccountType === "BANK" || a.controlAccountType === "CASH");

  async function load() {
    try {
      const [c, e, a] = await Promise.all([
        api<Claim[]>(`/clients/${clientId}/expense-claims`),
        api<Employee[]>(`/clients/${clientId}/employees`),
        api<Account[]>(`/clients/${clientId}/accounts`),
      ]);
      setClaims(c);
      setEmployees(e);
      setAccounts(a);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load expense claims");
    }
  }

  useEffect(() => {
    load();
  }, [clientId]);

  function updateLine(i: number, patch: Partial<DraftLine>) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api(`/clients/${clientId}/expense-claims`, {
        method: "POST",
        body: {
          employeeId,
          claimNumber,
          date,
          lines: lines.map((l) => ({ ...l, amount: parseFloat(l.amount) || 0 })),
        },
      });
      setEmployeeId("");
      setClaimNumber("");
      setLines([emptyLine()]);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create expense claim");
    } finally {
      setSubmitting(false);
    }
  }

  async function action(id: string, step: "submit" | "approve" | "reject") {
    setBusyId(id);
    setError(null);
    try {
      await api(`/clients/${clientId}/expense-claims/${id}/${step}`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Failed to ${step} claim`);
    } finally {
      setBusyId(null);
    }
  }

  async function onPost(id: string) {
    if (cashAccounts.length === 0) {
      setError("No bank/cash control account found to reimburse from");
      return;
    }
    const paymentAccountId = cashAccounts[0].id;
    setBusyId(id);
    setError(null);
    try {
      await api(`/clients/${clientId}/expense-claims/${id}/post`, { method: "POST", body: { paymentAccountId } });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to post claim");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>Expense claims</h2>
        <button onClick={() => setShowForm((s) => !s)}>{showForm ? "Cancel" : "+ New claim"}</button>
      </div>

      {showForm && (
        <form onSubmit={onCreate} className="card stack">
          <div className="row">
            <div className="stack" style={{ flex: 1 }}>
              <label>Employee</label>
              <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required>
                <option value="">Select employee</option>
                {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>)}
              </select>
            </div>
            <div className="stack">
              <label>Claim number</label>
              <input value={claimNumber} onChange={(e) => setClaimNumber(e.target.value)} required />
            </div>
            <div className="stack">
              <label>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Category</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i}>
                  <td><input value={l.description} onChange={(e) => updateLine(i, { description: e.target.value })} required /></td>
                  <td><input type="date" value={l.date} onChange={(e) => updateLine(i, { date: e.target.value })} required /></td>
                  <td><input type="number" step="0.01" style={{ width: 90 }} value={l.amount} onChange={(e) => updateLine(i, { amount: e.target.value })} required /></td>
                  <td>
                    <select value={l.categoryAccountId} onChange={(e) => updateLine(i, { categoryAccountId: e.target.value })} required>
                      <option value="">Select account</option>
                      {expenseAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                    </select>
                  </td>
                  <td>
                    {lines.length > 1 && (
                      <button type="button" className="secondary" onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))}>Remove</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="secondary" onClick={() => setLines((ls) => [...ls, emptyLine()])}>+ Add line</button>

          {error && <div className="error">{error}</div>}
          <div>
            <button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save as draft"}</button>
          </div>
        </form>
      )}

      {!showForm && error && <div className="error">{error}</div>}

      <div className="card">
        {claims === null ? (
          <p className="muted">Loading...</p>
        ) : claims.length === 0 ? (
          <p className="muted">No expense claims yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Claim #</th>
                <th>Employee</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {claims.map((c) => (
                <tr key={c.id}>
                  <td>{c.claimNumber}</td>
                  <td>{c.employee.firstName} {c.employee.lastName}</td>
                  <td>{new Date(c.date).toLocaleDateString()}</td>
                  <td>{Number(c.totalAmount).toFixed(2)}</td>
                  <td><span className={`badge ${c.status.toLowerCase()}`}>{c.status}</span></td>
                  <td className="row">
                    {c.status === "DRAFT" && (
                      <button className="secondary" disabled={busyId === c.id} onClick={() => action(c.id, "submit")}>Submit</button>
                    )}
                    {c.status === "SUBMITTED" && (
                      <>
                        <button className="secondary" disabled={busyId === c.id} onClick={() => action(c.id, "approve")}>Approve</button>
                        <button className="danger" disabled={busyId === c.id} onClick={() => action(c.id, "reject")}>Reject</button>
                      </>
                    )}
                    {c.status === "APPROVED" && (
                      <button className="secondary" disabled={busyId === c.id} onClick={() => onPost(c.id)}>Post (reimburse)</button>
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

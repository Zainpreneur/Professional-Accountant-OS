"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

interface Customer {
  id: string;
  code: string;
  name: string;
}
interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
}
interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  status: string;
  total: string;
  amountPaid: string;
  customer: Customer;
}

type DraftLine = { description: string; quantity: string; unitPrice: string; taxRate: string; revenueAccountId: string };
const emptyLine = (): DraftLine => ({ description: "", quantity: "1", unitPrice: "", taxRate: "15", revenueAccountId: "" });

export default function InvoicesPage({ params }: { params: { clientId: string } }) {
  const { clientId } = params;
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [customerId, setCustomerId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);

  const revenueAccounts = accounts.filter((a) => a.type === "REVENUE");

  async function load() {
    try {
      const [inv, cust, acc] = await Promise.all([
        api<Invoice[]>(`/clients/${clientId}/invoices`),
        api<Customer[]>(`/clients/${clientId}/customers`),
        api<Account[]>(`/clients/${clientId}/accounts`),
      ]);
      setInvoices(inv);
      setCustomers(cust);
      setAccounts(acc);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load invoices");
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
      await api(`/clients/${clientId}/invoices`, {
        method: "POST",
        body: {
          customerId,
          invoiceNumber,
          date,
          dueDate,
          lines: lines.map((l) => ({
            description: l.description,
            quantity: parseFloat(l.quantity) || 1,
            unitPrice: parseFloat(l.unitPrice) || 0,
            taxRate: parseFloat(l.taxRate) || 0,
            revenueAccountId: l.revenueAccountId,
          })),
        },
      });
      setCustomerId("");
      setInvoiceNumber("");
      setLines([emptyLine()]);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create invoice");
    } finally {
      setSubmitting(false);
    }
  }

  async function onPost(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await api(`/clients/${clientId}/invoices/${id}/post`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to post invoice");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>Sales invoices</h2>
        <button onClick={() => setShowForm((s) => !s)}>{showForm ? "Cancel" : "+ New invoice"}</button>
      </div>

      {showForm && (
        <form onSubmit={onCreate} className="card stack">
          <div className="row">
            <div className="stack" style={{ flex: 1 }}>
              <label>Customer</label>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
                <option value="">Select customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="stack">
              <label>Invoice number</label>
              <input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} required />
            </div>
            <div className="stack">
              <label>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="stack">
              <label>Due date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit price</th>
                <th>Tax %</th>
                <th>Revenue account</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i}>
                  <td>
                    <input value={l.description} onChange={(e) => updateLine(i, { description: e.target.value })} required />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      style={{ width: 70 }}
                      value={l.quantity}
                      onChange={(e) => updateLine(i, { quantity: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      style={{ width: 90 }}
                      value={l.unitPrice}
                      onChange={(e) => updateLine(i, { unitPrice: e.target.value })}
                      required
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      style={{ width: 70 }}
                      value={l.taxRate}
                      onChange={(e) => updateLine(i, { taxRate: e.target.value })}
                    />
                  </td>
                  <td>
                    <select value={l.revenueAccountId} onChange={(e) => updateLine(i, { revenueAccountId: e.target.value })} required>
                      <option value="">Select account</option>
                      {revenueAccounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} - {a.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {lines.length > 1 && (
                      <button type="button" className="secondary" onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))}>
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="secondary" onClick={() => setLines((ls) => [...ls, emptyLine()])}>
            + Add line
          </button>

          {error && <div className="error">{error}</div>}

          <div>
            <button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save as draft"}
            </button>
          </div>
        </form>
      )}

      {!showForm && error && <div className="error">{error}</div>}

      <div className="card">
        {invoices === null ? (
          <p className="muted">Loading...</p>
        ) : invoices.length === 0 ? (
          <p className="muted">No invoices yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Number</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Due</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>{inv.invoiceNumber}</td>
                  <td>{inv.customer.name}</td>
                  <td>{new Date(inv.date).toLocaleDateString()}</td>
                  <td>{new Date(inv.dueDate).toLocaleDateString()}</td>
                  <td>{Number(inv.total).toFixed(2)}</td>
                  <td>{Number(inv.amountPaid).toFixed(2)}</td>
                  <td>
                    <span className={`badge ${inv.status.toLowerCase().replace("_", "-")}`}>{inv.status}</span>
                  </td>
                  <td>
                    {inv.status === "DRAFT" && (
                      <button className="secondary" disabled={busyId === inv.id} onClick={() => onPost(inv.id)}>
                        Post
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

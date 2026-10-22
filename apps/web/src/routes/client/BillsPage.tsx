import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

interface Supplier {
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
interface Bill {
  id: string;
  billNumber: string;
  date: string;
  dueDate: string;
  status: string;
  total: string;
  amountPaid: string;
  supplier: Supplier;
}

type DraftLine = { description: string; quantity: string; unitPrice: string; taxRate: string; expenseAccountId: string };
const emptyLine = (): DraftLine => ({ description: "", quantity: "1", unitPrice: "", taxRate: "15", expenseAccountId: "" });

export default function BillsPage() {
  const { clientId = "" } = useParams<{ clientId: string }>();
  const [bills, setBills] = useState<Bill[] | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [supplierId, setSupplierId] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);

  const expenseAccounts = accounts.filter((a) => a.type === "EXPENSE");

  async function load() {
    try {
      const [b, s, a] = await Promise.all([
        api<Bill[]>(`/clients/${clientId}/bills`),
        api<Supplier[]>(`/clients/${clientId}/suppliers`),
        api<Account[]>(`/clients/${clientId}/accounts`),
      ]);
      setBills(b);
      setSuppliers(s);
      setAccounts(a);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load bills");
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
      await api(`/clients/${clientId}/bills`, {
        method: "POST",
        body: {
          supplierId,
          billNumber,
          date,
          dueDate,
          lines: lines.map((l) => ({
            description: l.description,
            quantity: parseFloat(l.quantity) || 1,
            unitPrice: parseFloat(l.unitPrice) || 0,
            taxRate: parseFloat(l.taxRate) || 0,
            expenseAccountId: l.expenseAccountId,
          })),
        },
      });
      setSupplierId("");
      setBillNumber("");
      setLines([emptyLine()]);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create bill");
    } finally {
      setSubmitting(false);
    }
  }

  async function onPost(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await api(`/clients/${clientId}/bills/${id}/post`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to post bill");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>Purchase bills</h2>
        <button onClick={() => setShowForm((s) => !s)}>{showForm ? "Cancel" : "+ New bill"}</button>
      </div>

      {showForm && (
        <form onSubmit={onCreate} className="card stack">
          <div className="row">
            <div className="stack" style={{ flex: 1 }}>
              <label>Supplier</label>
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
                <option value="">Select supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="stack">
              <label>Bill number</label>
              <input value={billNumber} onChange={(e) => setBillNumber(e.target.value)} required />
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
                <th>Expense account</th>
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
                    <select value={l.expenseAccountId} onChange={(e) => updateLine(i, { expenseAccountId: e.target.value })} required>
                      <option value="">Select account</option>
                      {expenseAccounts.map((a) => (
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
        {bills === null ? (
          <p className="muted">Loading...</p>
        ) : bills.length === 0 ? (
          <p className="muted">No bills yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Number</th>
                <th>Supplier</th>
                <th>Date</th>
                <th>Due</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {bills.map((b) => (
                <tr key={b.id}>
                  <td>{b.billNumber}</td>
                  <td>{b.supplier.name}</td>
                  <td>{new Date(b.date).toLocaleDateString()}</td>
                  <td>{new Date(b.dueDate).toLocaleDateString()}</td>
                  <td>{Number(b.total).toFixed(2)}</td>
                  <td>{Number(b.amountPaid).toFixed(2)}</td>
                  <td>
                    <span className={`badge ${b.status.toLowerCase().replace("_", "-")}`}>{b.status}</span>
                  </td>
                  <td>
                    {b.status === "DRAFT" && (
                      <button className="secondary" disabled={busyId === b.id} onClick={() => onPost(b.id)}>
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

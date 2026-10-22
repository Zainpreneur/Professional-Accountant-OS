import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

interface Account {
  id: string;
  code: string;
  name: string;
}

interface JournalLine {
  id: string;
  account: Account;
  debit: string;
  credit: string;
  description: string | null;
}

interface Journal {
  id: string;
  journalNumber: string;
  date: string;
  description: string | null;
  status: string;
  source: string;
  lines: JournalLine[];
}

type DraftLine = { accountId: string; debit: string; credit: string; description: string };

const emptyLine = (): DraftLine => ({ accountId: "", debit: "", credit: "" as string, description: "" });

export default function JournalsPage() {
  const { clientId = "" } = useParams<{ clientId: string }>();
  const [journals, setJournals] = useState<Journal[] | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([emptyLine(), emptyLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    try {
      const [j, a] = await Promise.all([
        api<Journal[]>(`/clients/${clientId}/journals`),
        api<Account[]>(`/clients/${clientId}/accounts`),
      ]);
      setJournals(j);
      setAccounts(a);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load journals");
    }
  }

  useEffect(() => {
    load();
  }, [clientId]);

  function updateLine(i: number, patch: Partial<DraftLine>) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api(`/clients/${clientId}/journals`, {
        method: "POST",
        body: {
          date,
          description,
          lines: lines
            .filter((l) => l.accountId)
            .map((l) => ({
              accountId: l.accountId,
              debit: parseFloat(l.debit) || 0,
              credit: parseFloat(l.credit) || 0,
              description: l.description || undefined,
            })),
        },
      });
      setDescription("");
      setLines([emptyLine(), emptyLine()]);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create journal");
    } finally {
      setSubmitting(false);
    }
  }

  async function onPost(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await api(`/clients/${clientId}/journals/${id}/post`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to post journal");
    } finally {
      setBusyId(null);
    }
  }

  async function onReverse(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await api(`/clients/${clientId}/journals/${id}/reverse`, { method: "POST", body: {} });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to reverse journal");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>Journals</h2>
        <button onClick={() => setShowForm((s) => !s)}>{showForm ? "Cancel" : "+ Manual journal entry"}</button>
      </div>

      {showForm && (
        <form onSubmit={onCreate} className="card stack">
          <div className="row">
            <div className="stack">
              <label>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="stack" style={{ flex: 1 }}>
              <label>Description</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Account</th>
                <th>Debit</th>
                <th>Credit</th>
                <th>Line description</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i}>
                  <td>
                    <select value={l.accountId} onChange={(e) => updateLine(i, { accountId: e.target.value })} required>
                      <option value="">Select account</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} - {a.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      style={{ width: 100 }}
                      value={l.debit}
                      onChange={(e) => updateLine(i, { debit: e.target.value, credit: "" })}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      style={{ width: 100 }}
                      value={l.credit}
                      onChange={(e) => updateLine(i, { credit: e.target.value, debit: "" })}
                    />
                  </td>
                  <td>
                    <input value={l.description} onChange={(e) => updateLine(i, { description: e.target.value })} />
                  </td>
                  <td>
                    {lines.length > 2 && (
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))}
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="row" style={{ justifyContent: "space-between" }}>
            <button type="button" className="secondary" onClick={() => setLines((ls) => [...ls, emptyLine()])}>
              + Add line
            </button>
            <div className="muted">
              Debit {totalDebit.toFixed(2)} / Credit {totalCredit.toFixed(2)}{" "}
              {Math.abs(totalDebit - totalCredit) > 0.005 && <span className="error">(not balanced)</span>}
            </div>
          </div>

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
        {journals === null ? (
          <p className="muted">Loading...</p>
        ) : journals.length === 0 ? (
          <p className="muted">No journals yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Number</th>
                <th>Date</th>
                <th>Description</th>
                <th>Source</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {journals.map((j) => (
                <tr key={j.id}>
                  <td>{j.journalNumber}</td>
                  <td>{new Date(j.date).toLocaleDateString()}</td>
                  <td>{j.description ?? "-"}</td>
                  <td>{j.source}</td>
                  <td>
                    <span className={`badge ${j.status.toLowerCase()}`}>{j.status}</span>
                  </td>
                  <td>
                    {j.status === "DRAFT" && (
                      <button className="secondary" disabled={busyId === j.id} onClick={() => onPost(j.id)}>
                        Post
                      </button>
                    )}
                    {j.status === "POSTED" && (
                      <button className="danger" disabled={busyId === j.id} onClick={() => onReverse(j.id)}>
                        Reverse
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

import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

interface Deadline {
  id: string;
  category: string;
  title: string;
  dueDate: string;
  status: string;
  bucket: string;
  notes: string | null;
}

const BUCKET_ORDER = ["OVERDUE", "DUE_TODAY", "DUE_THIS_WEEK", "DUE_THIS_MONTH", "UPCOMING", "COMPLETED"] as const;
const BUCKET_LABELS: Record<string, string> = {
  OVERDUE: "Overdue",
  DUE_TODAY: "Due today",
  DUE_THIS_WEEK: "Due this week",
  DUE_THIS_MONTH: "Due this month",
  UPCOMING: "Upcoming",
  COMPLETED: "Completed",
};

export default function CompliancePage() {
  const { clientId = "" } = useParams<{ clientId: string }>();
  const [buckets, setBuckets] = useState<Record<string, Deadline[]> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", dueDate: new Date().toISOString().slice(0, 10), notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    try {
      const data = await api<{ buckets: Record<string, Deadline[]> }>(`/clients/${clientId}/compliance-deadlines`);
      setBuckets(data.buckets);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load compliance calendar");
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
      await api(`/clients/${clientId}/compliance-deadlines`, { method: "POST", body: form });
      setForm({ title: "", dueDate: new Date().toISOString().slice(0, 10), notes: "" });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create deadline");
    } finally {
      setSubmitting(false);
    }
  }

  async function onComplete(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await api(`/clients/${clientId}/compliance-deadlines/${id}/complete`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to complete deadline");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>Compliance calendar</h2>
        <button onClick={() => setShowForm((s) => !s)}>{showForm ? "Cancel" : "+ Custom deadline"}</button>
      </div>

      {showForm && (
        <form onSubmit={onCreate} className="card row" style={{ alignItems: "flex-end" }}>
          <div className="stack" style={{ flex: 1 }}>
            <label>Title</label>
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
          </div>
          <div className="stack">
            <label>Due date</label>
            <input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} required />
          </div>
          <div className="stack" style={{ flex: 1 }}>
            <label>Notes</label>
            <input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
          <button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Add"}</button>
        </form>
      )}

      {error && <div className="error">{error}</div>}

      {buckets === null ? (
        <p className="muted">Loading...</p>
      ) : (
        <div className="kpi-grid">
          {BUCKET_ORDER.map((b) => (
            <div className="kpi" key={b}>
              <div className="value">{buckets[b]?.length ?? 0}</div>
              <div className="label">{BUCKET_LABELS[b]}</div>
            </div>
          ))}
        </div>
      )}

      {buckets &&
        BUCKET_ORDER.filter((b) => b !== "COMPLETED" && buckets[b]?.length > 0).map((b) => (
          <div className="card" key={b}>
            <strong>{BUCKET_LABELS[b]}</strong>
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Due date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {buckets[b].map((d) => (
                  <tr key={d.id}>
                    <td>{d.title}</td>
                    <td>{d.category}</td>
                    <td>{new Date(d.dueDate).toLocaleDateString()}</td>
                    <td>
                      <button className="secondary" disabled={busyId === d.id} onClick={() => onComplete(d.id)}>
                        Mark complete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

      {buckets && buckets.COMPLETED?.length > 0 && (
        <div className="card">
          <strong>Completed</strong>
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Due date</th>
              </tr>
            </thead>
            <tbody>
              {buckets.COMPLETED.map((d) => (
                <tr key={d.id}>
                  <td>{d.title}</td>
                  <td>{d.category}</td>
                  <td>{new Date(d.dueDate).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

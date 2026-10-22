import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

interface TrialBalanceRow {
  code: string;
  name: string;
  type: string;
  debit: number;
  credit: number;
}
interface TrialBalance {
  asOf: string;
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
}
interface AgingDoc {
  partyName: string;
  documentNumber: string;
  dueDate: string;
  outstanding: number;
  daysOverdue: number;
  bucket: string;
}
interface Aging {
  documents: AgingDoc[];
  totals: Record<string, number>;
}

const BUCKETS = ["current", "1-30", "31-60", "61-90", "90+"];

function AgingTable({ title, aging }: { title: string; aging: Aging | null }) {
  return (
    <div className="card stack">
      <h2 style={{ fontSize: 16, margin: 0 }}>{title}</h2>
      {!aging ? (
        <p className="muted">Loading...</p>
      ) : (
        <>
          <div className="kpi-grid">
            {BUCKETS.map((b) => (
              <div className="kpi" key={b}>
                <div className="value">{(aging.totals[b] ?? 0).toFixed(2)}</div>
                <div className="label">{b}</div>
              </div>
            ))}
          </div>
          {aging.documents.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>Party</th>
                  <th>Document</th>
                  <th>Due date</th>
                  <th>Days overdue</th>
                  <th>Bucket</th>
                  <th>Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {aging.documents.map((d, i) => (
                  <tr key={i}>
                    <td>{d.partyName}</td>
                    <td>{d.documentNumber}</td>
                    <td>{new Date(d.dueDate).toLocaleDateString()}</td>
                    <td>{d.daysOverdue}</td>
                    <td>{d.bucket}</td>
                    <td>{d.outstanding.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const { clientId = "" } = useParams<{ clientId: string }>();
  const [tb, setTb] = useState<TrialBalance | null>(null);
  const [ar, setAr] = useState<Aging | null>(null);
  const [ap, setAp] = useState<Aging | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api<TrialBalance>(`/clients/${clientId}/reports/trial-balance`),
      api<Aging>(`/clients/${clientId}/reports/ar-aging`),
      api<Aging>(`/clients/${clientId}/reports/ap-aging`),
    ])
      .then(([t, a, p]) => {
        setTb(t);
        setAr(a);
        setAp(p);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load reports"));
  }, [clientId]);

  return (
    <div className="stack">
      {error && <div className="error">{error}</div>}

      <div className="card stack">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 16, margin: 0 }}>Trial balance</h2>
          {tb && <span className={`badge ${tb.balanced ? "active" : "void"}`}>{tb.balanced ? "Balanced" : "Out of balance"}</span>}
        </div>
        {!tb ? (
          <p className="muted">Loading...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Account</th>
                <th>Type</th>
                <th>Debit</th>
                <th>Credit</th>
              </tr>
            </thead>
            <tbody>
              {tb.rows
                .filter((r) => r.debit !== 0 || r.credit !== 0)
                .map((r) => (
                  <tr key={r.code}>
                    <td>{r.code}</td>
                    <td>{r.name}</td>
                    <td>{r.type}</td>
                    <td>{r.debit.toFixed(2)}</td>
                    <td>{r.credit.toFixed(2)}</td>
                  </tr>
                ))}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 700 }}>
                <td colSpan={3}>Total</td>
                <td>{tb.totalDebit.toFixed(2)}</td>
                <td>{tb.totalCredit.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      <AgingTable title="Accounts receivable aging" aging={ar} />
      <AgingTable title="Accounts payable aging" aging={ap} />
    </div>
  );
}

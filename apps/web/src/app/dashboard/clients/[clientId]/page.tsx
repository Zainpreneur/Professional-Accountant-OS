"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Client {
  id: string;
  legalName: string;
  tradingName: string | null;
  entityType: string | null;
  businessCategory: string | null;
  jurisdiction: string;
  taxRegistrationNumber: string | null;
  baseCurrency: string;
  status: string;
}

interface TrialBalance {
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
}

interface Aging {
  totals: Record<string, number>;
}

export default function ClientOverviewPage({ params }: { params: { clientId: string } }) {
  const { clientId } = params;
  const [client, setClient] = useState<Client | null>(null);
  const [tb, setTb] = useState<TrialBalance | null>(null);
  const [ar, setAr] = useState<Aging | null>(null);
  const [ap, setAp] = useState<Aging | null>(null);

  useEffect(() => {
    api<Client>(`/clients/${clientId}`).then(setClient);
    api<TrialBalance>(`/clients/${clientId}/reports/trial-balance`).then(setTb);
    api<Aging>(`/clients/${clientId}/reports/ar-aging`).then(setAr);
    api<Aging>(`/clients/${clientId}/reports/ap-aging`).then(setAp);
  }, [clientId]);

  const totalAr = ar ? Object.values(ar.totals).reduce((a, b) => a + b, 0) : null;
  const totalAp = ap ? Object.values(ap.totals).reduce((a, b) => a + b, 0) : null;

  return (
    <div className="stack">
      <div className="kpi-grid">
        <div className="kpi">
          <div className="value">{tb ? tb.totalDebit.toLocaleString() : "..."}</div>
          <div className="label">Ledger total (Dr)</div>
        </div>
        <div className="kpi">
          <div className="value">{tb ? (tb.balanced ? "Balanced" : "Out of balance") : "..."}</div>
          <div className="label">Ledger status</div>
        </div>
        <div className="kpi">
          <div className="value">{totalAr !== null ? totalAr.toLocaleString() : "..."}</div>
          <div className="label">Accounts receivable</div>
        </div>
        <div className="kpi">
          <div className="value">{totalAp !== null ? totalAp.toLocaleString() : "..."}</div>
          <div className="label">Accounts payable</div>
        </div>
      </div>

      <div className="card stack">
        <h2 style={{ fontSize: 16, margin: 0 }}>Business information</h2>
        {!client ? (
          <p className="muted">Loading...</p>
        ) : (
          <table>
            <tbody>
              <tr>
                <th>Entity type</th>
                <td>{client.entityType ?? "-"}</td>
              </tr>
              <tr>
                <th>Business category</th>
                <td>{client.businessCategory ?? "-"}</td>
              </tr>
              <tr>
                <th>Jurisdiction</th>
                <td>{client.jurisdiction}</td>
              </tr>
              <tr>
                <th>Tax registration number</th>
                <td>{client.taxRegistrationNumber ?? "-"}</td>
              </tr>
              <tr>
                <th>Base currency</th>
                <td>{client.baseCurrency}</td>
              </tr>
              <tr>
                <th>Status</th>
                <td>
                  <span className={`badge ${client.status.toLowerCase()}`}>{client.status}</span>
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

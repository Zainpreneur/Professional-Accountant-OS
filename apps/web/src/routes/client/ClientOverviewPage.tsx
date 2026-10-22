import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Building2,
  CheckCircle2,
  FileText,
  Landmark,
  ReceiptText,
  Scale,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatMoney, formatNumber, humanize } from "@/lib/format";
import { Alert, EmptyState, LoadingState, StatCard, StatusBadge } from "@/components/ui";

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

export function ClientOverviewPage() {
  const { clientId = "" } = useParams<{ clientId: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [tb, setTb] = useState<TrialBalance | null>(null);
  const [ar, setAr] = useState<Aging | null>(null);
  const [ap, setAp] = useState<Aging | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setClient(null);
    setTb(null);
    setAr(null);
    setAp(null);
    setError(null);

    api<Client>(`/clients/${clientId}`)
      .then((row) => !cancelled && setClient(row))
      .catch((err: Error) => !cancelled && setError(err.message));
    api<TrialBalance>(`/clients/${clientId}/reports/trial-balance`)
      .then((row) => !cancelled && setTb(row))
      .catch(() => undefined);
    api<Aging>(`/clients/${clientId}/reports/ar-aging`)
      .then((row) => !cancelled && setAr(row))
      .catch(() => undefined);
    api<Aging>(`/clients/${clientId}/reports/ap-aging`)
      .then((row) => !cancelled && setAp(row))
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const currency = client?.baseCurrency ?? "SAR";
  const totalAr = ar ? Object.values(ar.totals).reduce((sum, value) => sum + value, 0) : null;
  const totalAp = ap ? Object.values(ap.totals).reduce((sum, value) => sum + value, 0) : null;
  const base = `/dashboard/clients/${clientId}`;

  return (
    <div className="page">
      {error && <Alert>Could not load the client overview: {error}</Alert>}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Ledger total (Dr)"
          value={tb ? formatNumber(tb.totalDebit) : "—"}
          hint={tb ? `Credit ${formatNumber(tb.totalCredit)} ${currency}` : "Reading trial balance…"}
          icon={BookOpen}
          tone="brand"
        />
        <StatCard
          label="Ledger status"
          value={tb ? (tb.balanced ? "Balanced" : "Review needed") : "—"}
          hint={tb ? (tb.balanced ? "Debits equal credits" : "Debits and credits differ") : "Reading trial balance…"}
          icon={tb?.balanced === false ? AlertTriangle : Scale}
          tone={tb?.balanced === false ? "rose" : "emerald"}
        />
        <StatCard
          label="Accounts receivable"
          value={totalAr !== null ? formatNumber(totalAr) : "—"}
          hint={totalAr !== null ? `Open customer balances in ${currency}` : "Reading AR aging…"}
          icon={ReceiptText}
          tone="amber"
        />
        <StatCard
          label="Accounts payable"
          value={totalAp !== null ? formatNumber(totalAp) : "—"}
          hint={totalAp !== null ? `Open supplier balances in ${currency}` : "Reading AP aging…"}
          icon={FileText}
          tone="slate"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-card">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <Building2 className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <h2>Business information</h2>
                <p className="text-xs text-slate-500">Entity profile and registration details</p>
              </div>
            </div>
            {client && <StatusBadge status={client.status} />}
          </div>

          <div className="p-5">
            {!client ? (
              error ? (
                <p className="text-sm text-slate-500">Client details are unavailable.</p>
              ) : (
                <LoadingState label="Loading client profile…" />
              )
            ) : (
              <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                <Info label="Legal name" value={client.legalName} />
                <Info label="Trading name" value={client.tradingName ?? "—"} />
                <Info label="Entity type" value={client.entityType ?? "—"} />
                <Info label="Business category" value={humanize(client.businessCategory)} />
                <Info label="Jurisdiction" value={client.jurisdiction} />
                <Info label="Tax registration number" value={client.taxRegistrationNumber ?? "—"} />
                <Info label="Base currency" value={client.baseCurrency} />
                <Info label="Client status" value={humanize(client.status)} />
              </dl>
            )}
          </div>
        </section>

        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-heading">Jump back in</p>
              <h2 className="mt-1">Common workflows</h2>
            </div>
            <Sparkles className="h-5 w-5 text-brand-400" aria-hidden />
          </div>

          <div className="mt-4 grid gap-2">
            <QuickLink to={`${base}/journals`} icon={BookOpen} label="Post a journal" tone="brand" />
            <QuickLink to={`${base}/invoices`} icon={ReceiptText} label="Raise an invoice" tone="emerald" />
            <QuickLink to={`${base}/bills`} icon={FileText} label="Enter a supplier bill" tone="amber" />
            <QuickLink to={`${base}/reports`} icon={BarChart3} label="Open financial reports" tone="slate" />
            <QuickLink to={`${base}/compliance`} icon={CheckCircle2} label="Review compliance" tone="emerald" />
            <QuickLink to={`${base}/ai-agents`} icon={Sparkles} label="AI review queue" tone="brand" />
          </div>
        </aside>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AgingCard
          title="Receivables aging"
          description="Open invoices by age bucket"
          totals={ar?.totals}
          total={totalAr}
          currency={currency}
          tone="emerald"
          icon={ReceiptText}
          href={`${base}/invoices`}
        />
        <AgingCard
          title="Payables aging"
          description="Open bills by age bucket"
          totals={ap?.totals}
          total={totalAp}
          currency={currency}
          tone="amber"
          icon={FileText}
          href={`${base}/bills`}
        />
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-800">{value}</dd>
    </div>
  );
}

const TONE_STYLES = {
  brand: "bg-brand-50 text-brand-600 ring-brand-100",
  emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  amber: "bg-amber-50 text-amber-600 ring-amber-100",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
} as const;

function QuickLink({
  to,
  icon: Icon,
  label,
  tone,
}: {
  to: string;
  icon: typeof BookOpen;
  label: string;
  tone: keyof typeof TONE_STYLES;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
    >
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ring-1 ${TONE_STYLES[tone]}`}>
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="flex-1">{label}</span>
      <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 transition group-hover:text-slate-500" aria-hidden />
    </Link>
  );
}

function AgingCard({
  title,
  description,
  totals,
  total,
  currency,
  tone,
  icon: Icon,
  href,
}: {
  title: string;
  description: string;
  totals: Record<string, number> | undefined;
  total: number | null;
  currency: string;
  tone: "emerald" | "amber";
  icon: typeof Landmark;
  href: string;
}) {
  const entries = Object.entries(totals ?? {});
  const max = Math.max(1, ...entries.map(([, value]) => value));
  const barTone = tone === "emerald" ? "bg-emerald-500" : "bg-amber-500";
  const iconTone = tone === "emerald" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconTone}`}>
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h2>{title}</h2>
            <p className="text-xs text-slate-500">{description}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold tracking-tight text-slate-900">
            {total !== null ? formatMoney(total, currency) : "—"}
          </p>
          <Link to={href} className="text-[11px] font-semibold text-brand-600 hover:text-brand-700">
            View ledger
          </Link>
        </div>
      </div>

      <div className="mt-4">
        {totals === undefined ? (
          <div className="space-y-3" aria-label="Loading aging data">
            {[0, 1, 2].map((row) => (
              <div key={row} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="h-3 w-20 animate-pulse rounded bg-slate-100" />
                  <span className="h-3 w-16 animate-pulse rounded bg-slate-100" />
                </div>
                <div className="h-1.5 animate-pulse rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
        ) : entries.length === 0 || total === 0 ? (
          <EmptyState icon={CheckCircle2} title="Nothing outstanding" description="There are no open balances in this ledger." />
        ) : (
          <ul className="space-y-3">
            {entries.map(([bucket, value]) => (
              <li key={bucket}>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-medium text-slate-600">{humanize(bucket)}</span>
                  <span className="font-semibold text-slate-800">{formatMoney(value, currency)}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${barTone}`} style={{ width: `${Math.max(3, (value / max) * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

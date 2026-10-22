import { Fragment, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useParams } from "react-router-dom";
import { ArrowLeft, BarChart3, Briefcase, Coins, Globe2, Hash, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { cn, humanize } from "@/lib/format";
import { StatusBadge } from "@/components/ui";

interface Client {
  id: string;
  legalName: string;
  tradingName: string | null;
  businessCategory: string | null;
  jurisdiction: string;
  taxRegistrationNumber: string | null;
  baseCurrency: string;
  status: string;
}

const TABS = [
  { group: "Accounting", to: "", label: "Overview" },
  { group: "Accounting", to: "/accounts", label: "Chart of accounts" },
  { group: "Accounting", to: "/journals", label: "Journals" },
  { group: "Accounting", to: "/reports", label: "Reports" },
  { group: "Receivables", to: "/customers", label: "Customers" },
  { group: "Receivables", to: "/invoices", label: "Invoices" },
  { group: "Payables", to: "/suppliers", label: "Suppliers" },
  { group: "Payables", to: "/bills", label: "Bills" },
  { group: "Payables", to: "/expenses", label: "Expenses" },
  { group: "Banking & assets", to: "/banking", label: "Banking" },
  { group: "Banking & assets", to: "/fixed-assets", label: "Fixed assets" },
  { group: "Banking & assets", to: "/inventory", label: "Inventory" },
  { group: "People", to: "/employees", label: "Employees" },
  { group: "People", to: "/payroll", label: "Payroll" },
  { group: "Practice", to: "/engagements", label: "Engagements" },
  { group: "Practice", to: "/judgment", label: "Judgment" },
  { group: "Practice", to: "/compliance", label: "Compliance" },
  { group: "Tax", to: "/vat", label: "VAT" },
  { group: "Tax", to: "/wht", label: "WHT" },
  { group: "Tax", to: "/zakat", label: "Zakat" },
  { group: "Automation", to: "/ai-agents", label: "AI workforce" },
];

export function ClientShell() {
  const { clientId = "" } = useParams<{ clientId: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setClient(null);
    setError(null);
    api<Client>(`/clients/${clientId}`)
      .then((row) => !cancelled && setClient(row))
      .catch((err: Error) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const base = `/dashboard/clients/${clientId}`;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          All clients
        </Link>

        <div className="mt-3 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="truncate">{client?.legalName ?? "Client workspace"}</h1>
              {client && <StatusBadge status={client.status} />}
            </div>
            {client?.tradingName && <p className="mt-0.5 text-sm text-slate-500">trading as {client.tradingName}</p>}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="chip">
                <Globe2 className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                {client ? client.jurisdiction : "—"}
              </span>
              <span className="chip">
                <Briefcase className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                {client ? humanize(client.businessCategory) : "—"}
              </span>
              <span className="chip">
                <Coins className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                {client?.baseCurrency ?? "—"}
              </span>
              {client?.taxRegistrationNumber && (
                <span className="chip">
                  <Hash className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                  {client.taxRegistrationNumber}
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Link
              to={`${base}/ai-agents`}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
            >
              <Sparkles className="h-4 w-4 text-brand-500" aria-hidden />
              AI review
            </Link>
            <Link
              to={`${base}/reports`}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
            >
              <BarChart3 className="h-4 w-4" aria-hidden />
              View reports
            </Link>
          </div>
        </div>
      </div>

      {error && <div className="error">Could not load this client: {error}</div>}

      <div className="sticky top-16 z-10 -mx-4 border-y border-slate-200/80 bg-slate-50/90 px-4 py-2.5 backdrop-blur lg:-mx-8 lg:px-8">
        <nav
          className="no-scrollbar flex items-center gap-1 overflow-x-auto pb-0.5 lg:flex-wrap lg:overflow-visible lg:pb-0"
          aria-label="Client sections"
        >
          {TABS.map((tab, index) => (
            <Fragment key={tab.to || "overview"}>
              {index > 0 && TABS[index - 1].group !== tab.group && (
                <span className="mx-1.5 h-5 w-px shrink-0 bg-slate-200" aria-hidden />
              )}
              <NavLink
                to={`${base}${tab.to}`}
                end={tab.to === ""}
                className={({ isActive }) =>
                  cn(
                    "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition",
                    isActive
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:bg-white hover:text-slate-900 hover:ring-1 hover:ring-slate-200",
                  )
                }
              >
                {tab.label}
              </NavLink>
            </Fragment>
          ))}
        </nav>
      </div>

      <div className="pb-4">
        <Outlet />
      </div>
    </div>
  );
}

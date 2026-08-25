"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Client {
  id: string;
  legalName: string;
  tradingName: string | null;
}

const TABS = [
  { href: "", label: "Overview" },
  { href: "/accounts", label: "Chart of Accounts" },
  { href: "/journals", label: "Journals" },
  { href: "/customers", label: "Customers" },
  { href: "/invoices", label: "Invoices" },
  { href: "/suppliers", label: "Suppliers" },
  { href: "/bills", label: "Bills" },
  { href: "/banking", label: "Banking" },
  { href: "/fixed-assets", label: "Fixed Assets" },
  { href: "/inventory", label: "Inventory" },
  { href: "/employees", label: "Employees" },
  { href: "/expenses", label: "Expenses" },
  { href: "/payroll", label: "Payroll" },
  { href: "/engagements", label: "Engagements" },
  { href: "/judgment", label: "Judgment" },
  { href: "/compliance", label: "Compliance" },
  { href: "/vat", label: "VAT" },
  { href: "/wht", label: "WHT" },
  { href: "/zakat", label: "Zakat" },
  { href: "/reports", label: "Reports" },
];

export default function ClientLayout({ children, params }: { children: React.ReactNode; params: { clientId: string } }) {
  const { clientId } = params;
  const pathname = usePathname();
  const base = `/dashboard/clients/${clientId}`;
  const [client, setClient] = useState<Client | null>(null);

  useEffect(() => {
    api<Client>(`/clients/${clientId}`)
      .then(setClient)
      .catch(() => setClient(null));
  }, [clientId]);

  return (
    <div className="page">
      <div className="stack">
        <Link href="/dashboard" className="muted">
          ← All clients
        </Link>
        <h1 style={{ fontSize: 22, margin: 0 }}>{client?.legalName ?? "..."}</h1>
        {client?.tradingName && <div className="muted">{client.tradingName}</div>}
      </div>

      <div className="tabs">
        {TABS.map((tab) => {
          const href = `${base}${tab.href}`;
          const active = tab.href === "" ? pathname === base : pathname.startsWith(href);
          return (
            <Link key={tab.href} href={href} className={active ? "active" : ""}>
              {tab.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}

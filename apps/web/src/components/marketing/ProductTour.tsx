import { useEffect, useState } from "react";
import {
  BookOpen,
  Check,
  LayoutDashboard,
  LockKeyhole,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/format";

const screens = [
  {
    id: "dashboard",
    label: "Firm dashboard",
    icon: LayoutDashboard,
    path: "/dashboard",
    src: "/marketing/dashboard.jpg",
    alt: "Accountant OS firm dashboard showing the client portfolio and practice metrics",
    title: "The whole practice, at a glance.",
    description:
      "Start the day with a live view of your portfolio, onboarding pipeline, and the work that needs attention.",
    bullets: ["Client portfolio and status filters", "Practice KPIs and quick actions", "Onboarding pipeline in one view"],
  },
  {
    id: "workspace",
    label: "Client workspace",
    icon: Users,
    path: "/dashboard/clients/demo-retail",
    src: "/marketing/overview.jpg",
    alt: "Accountant OS client workspace showing company details and financial overview",
    title: "Every client gets a real workspace.",
    description:
      "Entity details, books, tax profile, and connected workflows live together — not scattered across tabs and files.",
    bullets: ["Profile, jurisdiction, and tax registration", "AR, AP, and ledger health", "One-click access to every module"],
  },
  {
    id: "ledger",
    label: "Ledger & reports",
    icon: BookOpen,
    path: "/dashboard/clients/demo-retail/accounts",
    src: "/marketing/accounts.jpg",
    alt: "Accountant OS chart of accounts with a structured double-entry ledger",
    title: "A ledger built for professional work.",
    description:
      "A structured chart of accounts, tax-aware postings, and the reports your clients expect — all from the same source.",
    bullets: ["Chart of accounts by entity and category", "Journals, trial balance, and statements", "VAT, WHT, and Zakat ledgers"],
  },
  {
    id: "ai",
    label: "AI review",
    icon: Sparkles,
    path: "/dashboard/clients/demo-retail/ai-agents",
    src: "/marketing/ai-agents.jpg",
    alt: "Accountant OS AI workforce review queue showing findings for a professional to review",
    title: "AI drafts. Your team decides.",
    description:
      "Eight review agents scan real client data and surface findings with the records they came from. Nothing is signed off automatically.",
    bullets: ["Findings tied to source records", "Risk-ranked review queue", "Human approval before anything changes"],
  },
];

export function ProductTour() {
  const [active, setActive] = useState(0);
  const current = screens[active];

  useEffect(() => {
    for (const screen of screens) {
      const image = new Image();
      image.src = screen.src;
    }
  }, []);

  return (
    <div>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="marketing-eyebrow">Inside the workspace</p>
          <h2 className="mt-3 font-serif text-3xl font-normal tracking-[-0.02em] text-slate-900 sm:text-4xl lg:text-[2.85rem] lg:leading-[1.06]">
            See the practice, not just a dashboard.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
            A real look at the workspace — from the firm view to the ledger and the review queue. Use the tabs to
            move through the product.
          </p>
        </div>
        <p className="hidden items-center gap-2 text-xs font-medium text-slate-500 lg:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Live product view · illustrative data
        </p>
      </div>

      <div className="mt-8 flex flex-wrap gap-2" role="tablist" aria-label="Product workspace screens">
        {screens.map((screen, index) => {
          const Icon = screen.icon;
          const selected = index === active;
          return (
            <button
              key={screen.id}
              type="button"
              role="tab"
              id={`tour-tab-${screen.id}`}
              aria-selected={selected}
              aria-controls="product-tour-panel"
              onClick={() => setActive(index)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold shadow-sm transition",
                selected
                  ? "border-slate-900 bg-slate-900 text-white shadow-slate-900/20 hover:bg-slate-800"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-white hover:text-slate-900",
              )}
            >
              <Icon className={cn("h-3.5 w-3.5", selected ? "text-brand-300" : "text-slate-400")} aria-hidden />
              {screen.label}
            </button>
          );
        })}
      </div>

      <div
        id="product-tour-panel"
        role="tabpanel"
        aria-labelledby={`tour-tab-${current.id}`}
        className="relative mt-5"
      >
        <div
          className="pointer-events-none absolute -inset-6 rounded-[2.5rem] bg-[radial-gradient(ellipse_at_top,rgba(29,92,227,0.14),transparent_65%)] blur-xl"
          aria-hidden
        />
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.35)] sm:rounded-3xl sm:p-2">
          <div className="flex items-center gap-3 rounded-t-xl border-b border-slate-200 bg-slate-50 px-3 py-2.5 sm:px-4">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
            </div>
            <div className="mx-auto flex max-w-[70%] items-center gap-1.5 truncate rounded-md border border-slate-200 bg-white px-3 py-1 text-[10px] font-medium text-slate-500">
              <LockKeyhole className="h-3 w-3 shrink-0 text-slate-400" aria-hidden />
              <span className="truncate">app.accountant-os.com{current.path}</span>
            </div>
            <div className="hidden w-10 sm:block" />
          </div>

          <div className="relative aspect-[1440/1000] max-h-[640px] w-full overflow-hidden rounded-b-xl bg-slate-100">
            <img
              key={current.id}
              src={current.src}
              alt={current.alt}
              width={1440}
              height={1000}
              loading={active === 0 ? "eager" : "lazy"}
              className="h-full w-full animate-fade-in object-cover object-top"
            />
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 border-t border-slate-200 pt-7 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:gap-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">{current.label}</p>
          <h3 className="mt-2 font-serif text-2xl font-normal tracking-tight text-slate-900">{current.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{current.description}</p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-3 md:pt-1">
          {current.bullets.map((bullet) => (
            <li key={bullet} className="flex items-start gap-2 text-sm leading-relaxed text-slate-600">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
              </span>
              {bullet}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

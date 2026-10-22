import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BookOpenCheck,
  Boxes,
  BriefcaseBusiness,
  Building2,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FileSpreadsheet,
  Fingerprint,
  Landmark,
  Layers3,
  LockKeyhole,
  Menu,
  ReceiptText,
  ScanSearch,
  ServerCog,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  Workflow,
  X,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/format";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { HeroPreview } from "@/components/marketing/HeroPreview";
import { ProductTour } from "@/components/marketing/ProductTour";
import { Reveal } from "@/components/marketing/Reveal";

const navLinks = [
  { label: "Product", href: "#product" },
  { label: "Features", href: "#features" },
  { label: "Who it's for", href: "#audience" },
  { label: "Why Accountant OS", href: "#why" },
  { label: "Security", href: "#security" },
];

const modules = [
  "Chart of accounts",
  "Journals",
  "Reports",
  "Customers",
  "Invoices",
  "Suppliers",
  "Bills",
  "Expenses",
  "Banking",
  "Fixed assets",
  "Inventory",
  "Employees",
  "Payroll",
  "Engagements",
  "Judgment",
  "Compliance",
  "VAT",
  "WHT",
  "Zakat",
  "AI workforce",
  "Firm dashboard",
];

const personas = [
  {
    icon: Building2,
    title: "Boutique accounting firms",
    copy: "You've outgrown spreadsheets but don't want enterprise bloat.",
    bullets: ["A multi-client portfolio in one place", "Repeatable onboarding for every entity", "Firm-wide visibility without spreadsheets"],
  },
  {
    icon: BriefcaseBusiness,
    title: "Solo practitioners & CA firms",
    copy: "You wear every hat and need the whole practice in one calm place.",
    bullets: ["One login for the entire practice", "Client-ready books and reports", "AI-assisted first-pass review"],
  },
  {
    icon: Workflow,
    title: "Outsourced finance teams",
    copy: "You need clean handoffs, consistent books, and a clear review trail.",
    bullets: ["Role-aware access for your team", "Audit-ready actions and approvals", "A shared compliance calendar"],
  },
  {
    icon: Layers3,
    title: "Multi-entity groups",
    copy: "You need consolidated oversight without mixing up the books.",
    bullets: ["Isolated books for every entity", "Client-scoped permissions", "A single firm dashboard"],
  },
];

const reasons = [
  {
    title: "One source of truth",
    copy: "The ledger, compliance calendar, and review queue share the same client context. No re-keying. No version drift.",
  },
  {
    title: "Audit-ready by default",
    copy: "Every action is attributable. Reviews, changes, and sign-offs leave a trail you can stand behind.",
  },
  {
    title: "Compliance on rails",
    copy: "VAT, WHT, Zakat, and e-invoicing workflows live next to the books they depend on.",
  },
  {
    title: "Onboarding without the blank page",
    copy: "Business Compiler turns a short client questionnaire into a chart of accounts and the tax setup that client needs.",
  },
  {
    title: "AI with human sign-off",
    copy: "Agents draft and flag. Your team reviews, decides, and owns the outcome — nothing is posted automatically.",
  },
  {
    title: "Permissions that match a firm",
    copy: "Firm-wide roles and client-scoped access keep the right work with the right people.",
  },
];

const steps = [
  {
    icon: Building2,
    number: "01",
    title: "Tell us about the client",
    copy: "Entity, business category, jurisdiction, and tax registration. A few questions, not a configuration project.",
    detail: "Entity · category · jurisdiction",
  },
  {
    icon: Layers3,
    number: "02",
    title: "The compiler builds the books",
    copy: "A chart of accounts, tax-specific ledgers, and a compliance starting point — generated for the client's context.",
    detail: "Chart of accounts · tax ledgers",
  },
  {
    icon: Workflow,
    number: "03",
    title: "Run the work in one place",
    copy: "Post journals, issue invoices, file returns, and review AI findings. Every action stays connected to the ledger.",
    detail: "Books · compliance · review",
  },
];

const securityItems = [
  {
    icon: Layers3,
    title: "Multi-tenant isolation",
    copy: "Every record is scoped to a firm and a client.",
  },
  {
    icon: LockKeyhole,
    title: "Role-based permissions",
    copy: "Firm-wide and client-scoped access for every team.",
  },
  {
    icon: Fingerprint,
    title: "Audit trails",
    copy: "Actions and reviews remain attributable.",
  },
  {
    icon: ServerCog,
    title: "Permission-aware API",
    copy: "The same controls apply to every request.",
  },
];

const faqs = [
  {
    q: "Is Accountant OS a replacement for QuickBooks or Xero?",
    a: "It includes a full double-entry accounting core, so it can be the system of record for your clients. It is built for practices managing many entities, rather than a single-company bookkeeping app.",
  },
  {
    q: "Does it support Saudi VAT, WHT, and Zakat?",
    a: "Yes. Saudi Arabia is a first-class jurisdiction. Onboarding generates the relevant tax ledgers and compliance setup, and ZATCA-shaped e-invoicing output is generated locally. Direct Fatoora submission is on the roadmap.",
  },
  {
    q: "How does onboarding actually work?",
    a: "You answer a short set of questions about the entity, business category, jurisdiction, and tax registration. Business Compiler turns those answers into an opening chart of accounts and the tax-specific ledgers the client needs.",
  },
  {
    q: "Can I invite my team?",
    a: "Yes. Roles are firm-wide and client-scoped, so you can give people access to the work they need without exposing the rest of the portfolio.",
  },
  {
    q: "Does the AI make accounting decisions?",
    a: "No. The review agents scan client data and surface findings with citations. A professional reviews the finding, decides what to do, and owns the sign-off.",
  },
  {
    q: "Where does our data live?",
    a: "The platform is multi-tenant by design and can run on infrastructure you control. Access is enforced by firm, client, and role.",
  },
  {
    q: "How do I try it?",
    a: "Open the demo workspace with owner@demo-firm.test and Password123!, or create a firm to start with a clean workspace.",
  },
];

const footerColumns: Array<{ title: string; links: Array<{ label: string; href?: string; to?: string }> }> = [
  {
    title: "Product",
    links: [
      { label: "Product tour", href: "#tour" },
      { label: "Features", href: "#features" },
      { label: "Who it's for", href: "#audience" },
      { label: "Why Accountant OS", href: "#why" },
    ],
  },
  {
    title: "Platform",
    links: [
      { label: "How it works", href: "#how" },
      { label: "Security & control", href: "#security" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    title: "Get started",
    links: [
      { label: "Create your firm", to: "/register" },
      { label: "Sign in", to: "/login" },
      { label: "Demo workspace", to: "/login" },
    ],
  },
];

const iconTones: Record<string, string> = {
  brand: "bg-brand-50 text-brand-600 ring-brand-100",
  emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  amber: "bg-amber-50 text-amber-600 ring-amber-100",
  sky: "bg-sky-50 text-sky-600 ring-sky-100",
  violet: "bg-violet-50 text-violet-600 ring-violet-100",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
};

function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <p
      className={cn(
        "inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em]",
        light ? "text-brand-300" : "text-brand-600",
      )}
    >
      <span className={cn("h-px w-5", light ? "bg-brand-400/60" : "bg-brand-300")} />
      {children}
    </p>
  );
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 via-brand-500 to-brand-700 text-white shadow-lg shadow-brand-950/30 ring-1 ring-inset ring-white/20">
        <BookOpenCheck className="h-5 w-5" aria-hidden />
      </span>
      <span className="flex flex-col">
        <span className="text-sm font-semibold tracking-tight text-white">Accountant OS</span>
        {!compact && (
          <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-slate-400">
            Practice operating system
          </span>
        )}
      </span>
    </span>
  );
}

function FeatureCard({
  icon: Icon,
  label,
  title,
  description,
  tone = "brand",
  className,
  children,
}: {
  icon: typeof BookOpenCheck;
  label: string;
  title: string;
  description: string;
  tone?: keyof typeof iconTones;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Reveal
      className={cn(
        "group flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-card transition duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-pop sm:p-7",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-inset",
            iconTones[tone],
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      </div>
      <h3 className="mt-4 text-lg font-semibold tracking-tight text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
      <div className="mt-auto pt-6">{children}</div>
    </Reveal>
  );
}

export function LandingPage() {
  useDocumentTitle("Accountant OS — Every client. Every close. One calm workspace.");
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const primaryTo = user ? "/dashboard" : "/register";
  const primaryLabel = user ? "Open workspace" : "Start free";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 14);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth >= 1024) setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [menuOpen]);

  return (
    <div className="marketing-page bg-[#f7f6f2] text-slate-900">
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-300",
          scrolled || menuOpen
            ? "border-b border-white/10 bg-[#070b14]/90 shadow-lg shadow-slate-950/20 backdrop-blur-xl"
            : "bg-transparent",
        )}
      >
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
          <a href="#top" aria-label="Accountant OS home" onClick={() => setMenuOpen(false)}>
            <BrandMark />
          </a>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-full px-3.5 py-2 text-xs font-medium text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            {!user && (
              <Link
                to="/login"
                className="rounded-full px-3.5 py-2 text-xs font-semibold text-slate-300 transition hover:text-white"
              >
                Sign in
              </Link>
            )}
            <Link
              to={primaryTo}
              className="group inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-semibold text-slate-950 shadow-lg shadow-slate-950/20 transition hover:bg-brand-50"
            >
              {primaryLabel}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white shadow-none hover:bg-white/10 focus-visible:ring-white/30 lg:hidden"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="max-h-[calc(100vh-72px)] animate-fade-in overflow-y-auto border-t border-white/10 bg-[#070b14]/95 px-4 pb-6 pt-3 backdrop-blur-xl lg:hidden">
            <nav className="flex flex-col" aria-label="Mobile navigation">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="border-b border-white/5 py-3.5 text-sm font-medium text-slate-300 hover:text-white"
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="mt-5 flex flex-col gap-2">
              <Link
                to={primaryTo}
                onClick={() => setMenuOpen(false)}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-semibold text-slate-950"
              >
                {primaryLabel}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              {!user && (
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex items-center justify-center rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      <main>
        <section
          id="top"
          className="relative overflow-hidden bg-[#070b14] pb-14 pt-28 text-white sm:pt-32 lg:pb-20 lg:pt-36"
        >
          <div className="pointer-events-none absolute inset-0 marketing-grid opacity-[0.16]" aria-hidden />
          <div
            className="pointer-events-none absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(closest-side,rgba(29,92,227,0.38),transparent)] blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-56 right-[-10%] h-[38rem] w-[38rem] rounded-full bg-[radial-gradient(closest-side,rgba(16,185,129,0.18),transparent)] blur-2xl"
            aria-hidden
          />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" aria-hidden />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-14 lg:grid-cols-[1.02fr_1fr] lg:gap-10 xl:gap-16">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-slate-300 backdrop-blur">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </span>
                  Built for firms with more than one set of books
                </div>

                <h1 className="mt-6 text-balance font-serif text-[2.8rem] font-normal leading-[1.02] tracking-[-0.035em] text-white sm:text-6xl lg:text-[3.4rem] xl:text-[4.4rem]">
                  <span className="block">Every client.</span>
                  <span className="block">Every close.</span>
                  <span className="mt-2 block italic text-brand-300">One calm workspace.</span>
                </h1>

                <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-300/90 sm:text-lg">
                  The operating system for modern accounting practices. Bring double-entry books, Saudi compliance,
                  client work, and AI-assisted review into one auditable workspace.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link
                    to={primaryTo}
                    className="group inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3.5 text-sm font-semibold text-slate-950 shadow-xl shadow-slate-950/30 transition hover:bg-brand-50"
                  >
                    {primaryLabel}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                  <a
                    href="#tour"
                    className="group inline-flex items-center justify-center gap-2 rounded-full border border-white/[0.15] bg-white/[0.04] px-5 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:border-white/25 hover:bg-white/[0.08]"
                  >
                    See it in action
                    <ArrowUpRight className="h-4 w-4 text-slate-400 transition group-hover:text-white" aria-hidden />
                  </a>
                </div>

                <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-medium text-slate-400">
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
                    21 connected modules
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
                    Saudi VAT, WHT &amp; Zakat
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
                    Human-signed AI review
                  </span>
                </div>
              </div>

              <div className="relative mx-auto w-full max-w-[640px] lg:max-w-none">
                <HeroPreview />
                <p className="mt-5 text-center text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">
                  Illustrative workspace
                </p>
              </div>
            </div>

            <div className="mt-14 border-t border-white/10 pt-6 lg:mt-20">
              <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
                {[
                  { icon: Layers3, label: "21 connected modules", detail: "One client context" },
                  { icon: ReceiptText, label: "Saudi-first compliance", detail: "VAT · WHT · Zakat" },
                  { icon: Building2, label: "Multi-entity by design", detail: "Every client isolated" },
                  { icon: ShieldCheck, label: "Audit-ready workflows", detail: "Actions stay attributable" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-brand-300">
                        <Icon className="h-3.5 w-3.5" aria-hidden />
                      </span>
                      <span>
                        <span className="block text-[11px] font-semibold text-slate-200">{item.label}</span>
                        <span className="mt-0.5 block text-[10px] text-slate-400">{item.detail}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section id="product" className="bg-[#f7f6f2] py-20 sm:py-24 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Reveal className="mx-auto max-w-3xl text-center">
              <Eyebrow>The problem</Eyebrow>
              <h2 className="mt-4 text-balance font-serif text-3xl font-normal tracking-[-0.025em] text-slate-900 sm:text-4xl lg:text-[2.9rem] lg:leading-[1.06]">
                A practice isn't one ledger. It's a hundred moving parts.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
                Client books, tax deadlines, reviews, and handoffs usually live in different tools — and the firm
                spends its best hours moving data between them.
              </p>
            </Reveal>

            <div className="mt-12 grid items-stretch gap-4 lg:mt-16 lg:grid-cols-[1fr_auto_1fr]">
              <Reveal className="h-full">
                <div className="h-full rounded-3xl border border-slate-200 bg-white p-7 shadow-card sm:p-8">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                      <XCircle className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Without a practice OS
                    </p>
                  </div>
                  <ul className="mt-6 space-y-3.5">
                    {[
                      "Client ledgers scattered across files and tools",
                      "VAT, WHT, and Zakat tracked in spreadsheets",
                      "Review notes buried in email threads",
                      "Onboarding starts with a blank chart of accounts",
                      "No clear answer to who changed what",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-slate-600">
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" aria-hidden />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>

              <div className="hidden items-center justify-center lg:flex" aria-hidden>
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>

              <Reveal className="h-full" delay={100}>
                <div className="relative h-full overflow-hidden rounded-3xl bg-[#0a111f] p-7 text-white shadow-[0_24px_60px_-30px_rgba(15,23,42,0.8)] sm:p-8">
                  <div
                    className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-brand-500/20 blur-3xl"
                    aria-hidden
                  />
                  <div className="relative flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-300 ring-1 ring-inset ring-emerald-400/20">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      With Accountant OS
                    </p>
                  </div>
                  <ul className="relative mt-6 space-y-3.5">
                    {[
                      "One client workspace with a live double-entry ledger",
                      "Tax workflows and a shared compliance calendar",
                      "A review queue with findings tied to source records",
                      "Business Compiler generates the opening books",
                      "Every action attributable and audit-logged",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-slate-300">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </div>

            <Reveal className="mt-8 text-center" delay={120}>
              <p className="text-sm text-slate-500">
                The result: fewer handoffs, cleaner books, and a practice that scales without another spreadsheet.
              </p>
            </Reveal>
          </div>
        </section>

        <section id="features" className="bg-white py-20 sm:py-24 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Reveal className="grid gap-6 lg:grid-cols-[1fr_0.8fr] lg:items-end">
              <div>
                <Eyebrow>The platform</Eyebrow>
                <h2 className="mt-4 max-w-2xl text-balance font-serif text-3xl font-normal tracking-[-0.025em] text-slate-900 sm:text-4xl lg:text-[2.9rem] lg:leading-[1.06]">
                  A complete practice, not a patchwork.
                </h2>
              </div>
              <p className="max-w-lg text-base leading-relaxed text-slate-600 lg:justify-self-end">
                Twenty-one modules designed to work as one. Start with the ledger; add compliance, client work, and
                AI review as your firm grows.
              </p>
            </Reveal>

            <div className="mt-12 grid gap-4 lg:mt-16 lg:grid-cols-12">
              <FeatureCard
                className="lg:col-span-7"
                icon={BookOpenCheck}
                label="Accounting core"
                tone="brand"
                title="Double-entry books, built in."
                description="A real ledger with journals, chart of accounts, trial balance, and financial statements. Money stays precise and balances stay balanced."
              >
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] font-semibold text-slate-500">Trial balance · Oct 2026</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                      <CheckCircle2 className="h-2.5 w-2.5" aria-hidden />
                      Balanced
                    </span>
                  </div>
                  <div className="mt-2.5 space-y-1.5">
                    {[
                      ["1000", "Cash", "SAR 128,400.00"],
                      ["1100", "Accounts receivable", "SAR 84,200.00"],
                      ["2100", "VAT payable", "SAR 12,840.00"],
                      ["4000", "Revenue", "SAR 1,240,000.00"],
                    ].map(([code, name, amount]) => (
                      <div key={code} className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 text-[10px]">
                        <span className="text-slate-500">{code}</span>
                        <span className="truncate font-medium text-slate-600">{name}</span>
                        <span className="font-semibold tabular-nums text-slate-800">{amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </FeatureCard>

              <FeatureCard
                className="lg:col-span-5"
                icon={ReceiptText}
                label="Tax & compliance"
                tone="emerald"
                title="Saudi compliance, first-class."
                description="VAT, WHT, Zakat, and ZATCA-shaped e-invoicing live beside the books they depend on."
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {["VAT", "WHT", "Zakat", "E-invoicing"].map((chip) => (
                      <span
                        key={chip}
                        className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[9px] font-semibold text-emerald-700"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                    {[
                      { label: "VAT return · Q3", meta: "Due in 9 days", dot: "bg-amber-400", tone: "text-amber-600" },
                      { label: "WHT · September", meta: "Filed", dot: "bg-emerald-500", tone: "text-emerald-600" },
                      { label: "Zakat · FY2026", meta: "Upcoming", dot: "bg-slate-300", tone: "text-slate-500" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-2 py-1.5 first:pt-0 last:pb-0">
                        <span className={cn("h-1.5 w-1.5 rounded-full", item.dot)} />
                        <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-slate-600">{item.label}</span>
                        <span className={cn("text-[9px] font-semibold", item.tone)}>{item.meta}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </FeatureCard>

              <FeatureCard
                className="lg:col-span-4"
                icon={Wallet}
                label="Receivables & payables"
                tone="sky"
                title="Cash flow, without the chase."
                description="Invoices, bills, expenses, and aging that feed the ledger automatically."
              >
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-medium text-slate-600">Accounts receivable</span>
                      <span className="font-semibold tabular-nums text-slate-900">SAR 84.2k</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full w-[68%] rounded-full bg-brand-500" />
                    </div>
                    <p className="mt-1 text-[9px] text-slate-500">68% current · 22% over 30 days</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-medium text-slate-600">Accounts payable</span>
                      <span className="font-semibold tabular-nums text-slate-900">SAR 31.6k</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full w-[74%] rounded-full bg-emerald-500" />
                    </div>
                    <p className="mt-1 text-[9px] text-slate-500">74% current · 12% over 30 days</p>
                  </div>
                </div>
              </FeatureCard>

              <FeatureCard
                className="lg:col-span-4"
                icon={ClipboardCheck}
                label="Audit & engagements"
                tone="amber"
                title="From planning to sign-off."
                description="Run engagements with a structured trail from fieldwork to review and completion."
              >
                <div className="space-y-1.5">
                  {[
                    { label: "Planning", meta: "Complete", done: true },
                    { label: "Fieldwork", meta: "In progress", done: false },
                    { label: "Review & sign-off", meta: "Queued", done: false },
                  ].map((item, index) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2"
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold",
                          item.done ? "bg-emerald-500 text-white" : "bg-white text-slate-400 ring-1 ring-inset ring-slate-200",
                        )}
                      >
                        {item.done ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : index + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-slate-600">{item.label}</span>
                      <span className={cn("text-[9px] font-semibold", item.done ? "text-emerald-600" : "text-slate-500")}>
                        {item.meta}
                      </span>
                    </div>
                  ))}
                </div>
              </FeatureCard>

              <FeatureCard
                className="lg:col-span-4"
                icon={Sparkles}
                label="AI workforce"
                tone="violet"
                title="Findings, not black boxes."
                description="Eight agents scan real client data and cite the records behind every finding. Your team decides."
              >
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-amber-700">High priority</span>
                    <span className="text-[9px] font-medium text-amber-700">Unmatched bank line</span>
                  </div>
                  <p className="mt-1.5 text-[10px] font-semibold leading-relaxed text-slate-800">
                    SAR 4,280 debit without a matching invoice
                  </p>
                  <div className="mt-2 flex items-center gap-1.5 text-[9px] text-slate-500">
                    <ScanSearch className="h-3 w-3" aria-hidden />
                    3 source records cited
                  </div>
                </div>
              </FeatureCard>

              <FeatureCard
                className="lg:col-span-7"
                icon={Building2}
                label="Multi-entity"
                tone="brand"
                title="One login, every client entity."
                description="Switch between client workspaces without losing context, with access scoped to the people who need it."
              >
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      ["NW", "Northwind Trading"],
                      ["AV", "Avenue Consulting"],
                      ["HL", "Harbor Logistics"],
                      ["MS", "Mosaic Studio"],
                    ].map(([initials, name]) => (
                      <span
                        key={initials}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[9px] font-medium text-slate-600 shadow-sm"
                      >
                        <span className="flex h-4 w-4 items-center justify-center rounded bg-slate-100 text-[6px] font-bold text-slate-500">
                          {initials}
                        </span>
                        {name}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2.5 flex items-center gap-3 text-[9px] text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <BadgeCheck className="h-3 w-3 text-brand-500" aria-hidden />
                      Firm-wide roles
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <LockKeyhole className="h-3 w-3 text-brand-500" aria-hidden />
                      Client-scoped access
                    </span>
                  </div>
                </div>
              </FeatureCard>

              <FeatureCard
                className="lg:col-span-5"
                icon={Boxes}
                label="Back office"
                tone="slate"
                title="The rest of the practice, connected."
                description="Payroll, fixed assets, inventory, banking, and employees — all posting to the same ledger."
              >
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { icon: Landmark, label: "Banking" },
                    { icon: Wallet, label: "Payroll" },
                    { icon: Boxes, label: "Inventory" },
                    { icon: Building2, label: "Assets" },
                    { icon: Users, label: "Employees" },
                    { icon: FileSpreadsheet, label: "Reports" },
                    { icon: ReceiptText, label: "Expenses" },
                    { icon: ClipboardCheck, label: "Review" },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        className="rounded-lg border border-slate-200 bg-slate-50/70 px-1.5 py-2 text-center"
                      >
                        <Icon className="mx-auto h-3.5 w-3.5 text-slate-500" aria-hidden />
                        <span className="mt-1 block text-[7px] font-semibold text-slate-500">{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              </FeatureCard>
            </div>

            <Reveal className="mt-10 rounded-3xl border border-slate-200 bg-slate-50/70 p-6 sm:p-8">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Under the hood</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">21 connected modules. One client context.</p>
                </div>
                <span className="text-xs text-slate-500">Double-entry core included</span>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {modules.map((module) => (
                  <span
                    key={module}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:border-brand-200 hover:text-brand-700"
                  >
                    {module}
                  </span>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        <section id="tour" className="bg-[#f7f6f2] py-20 sm:py-24 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Reveal>
              <ProductTour />
            </Reveal>
          </div>
        </section>

        <section id="audience" className="bg-white py-20 sm:py-24 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Reveal className="grid gap-6 lg:grid-cols-[1fr_0.8fr] lg:items-end">
              <div>
                <Eyebrow>Who it's for</Eyebrow>
                <h2 className="mt-4 max-w-2xl text-balance font-serif text-3xl font-normal tracking-[-0.025em] text-slate-900 sm:text-4xl lg:text-[2.9rem] lg:leading-[1.06]">
                  Built for firms that carry more than one set of books.
                </h2>
              </div>
              <p className="max-w-lg text-base leading-relaxed text-slate-600 lg:justify-self-end">
                If your day is a portfolio of clients, deadlines, and reviews, you're in the right place. Accountant
                OS is for the practice behind the books.
              </p>
            </Reveal>

            <div className="mt-12 grid gap-4 md:grid-cols-2 lg:mt-16">
              {personas.map((persona, index) => {
                const Icon = persona.icon;
                return (
                  <Reveal key={persona.title} delay={index * 70}>
                    <div className="group h-full rounded-3xl border border-slate-200 bg-[#fbfbf9] p-7 transition duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-pop sm:p-8">
                      <div className="flex items-start justify-between gap-4">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-sm ring-1 ring-inset ring-slate-200">
                          <Icon className="h-5 w-5" aria-hidden />
                        </span>
                        <span className="font-serif text-3xl text-slate-200 transition group-hover:text-brand-200">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      </div>
                      <h3 className="mt-6 text-xl font-semibold tracking-tight text-slate-900">{persona.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">{persona.copy}</p>
                      <ul className="mt-5 space-y-2 border-t border-slate-200 pt-4">
                        {persona.bullets.map((bullet) => (
                          <li key={bullet} className="flex items-start gap-2 text-xs leading-relaxed text-slate-500">
                            <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" strokeWidth={3} aria-hidden />
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </Reveal>
                );
              })}
            </div>

            <Reveal className="mt-8 flex justify-center" delay={120}>
              <p className="inline-flex max-w-2xl items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-center text-xs leading-relaxed text-slate-500">
                <BadgeCheck className="h-4 w-4 shrink-0 text-brand-500" aria-hidden />
                Designed for practices managing many clients — not a single-company bookkeeping app.
              </p>
            </Reveal>
          </div>
        </section>

        <section id="why" className="bg-[#f7f6f2] py-20 sm:py-24 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
              <Reveal className="self-start lg:sticky lg:top-28">
                <Eyebrow>Why Accountant OS</Eyebrow>
                <h2 className="mt-4 text-balance font-serif text-3xl font-normal tracking-[-0.025em] text-slate-900 sm:text-4xl lg:text-[2.9rem] lg:leading-[1.06]">
                  Speed is nice. A ledger you can trust is better.
                </h2>
                <p className="mt-4 max-w-md text-base leading-relaxed text-slate-600">
                  Every workflow is designed around the same principle: the professional stays in control.
                </p>
                <Link
                  to={primaryTo}
                  className="group mt-7 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:bg-brand-700"
                >
                  {primaryLabel}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>

                <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
                  <p className="font-serif text-lg italic leading-relaxed text-slate-700">
                    “A practice runs on trust. The software should make that trust easier to prove.”
                  </p>
                  <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Product principle
                  </p>
                </div>
              </Reveal>

              <div className="space-y-0" role="list">
                {reasons.map((reason, index) => (
                  <Reveal key={reason.title} delay={index * 50}>
                    <div
                      role="listitem"
                      className="group border-t border-slate-300/70 py-6 first:border-t-0 first:pt-0"
                    >
                      <div className="flex gap-5">
                        <span className="font-serif text-2xl leading-none text-slate-300 transition group-hover:text-brand-400">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <h3 className="text-base font-semibold tracking-tight text-slate-900">{reason.title}</h3>
                          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{reason.copy}</p>
                        </div>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="relative overflow-hidden bg-[#070b14] py-20 text-white sm:py-24 lg:py-28">
          <div className="pointer-events-none absolute inset-0 marketing-grid opacity-[0.12]" aria-hidden />
          <div
            className="pointer-events-none absolute left-1/2 top-0 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-brand-600/20 blur-3xl"
            aria-hidden
          />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Reveal className="mx-auto max-w-3xl text-center">
              <Eyebrow light>How it works</Eyebrow>
              <h2 className="mt-4 text-balance font-serif text-3xl font-normal tracking-[-0.025em] text-white sm:text-4xl lg:text-[2.9rem] lg:leading-[1.06]">
                From new client to first close, without the setup spiral.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-400">
                The platform does the structural work up front, so your team can spend its time on the work that
                needs a professional.
              </p>
            </Reveal>

            <div className="relative mt-12 grid gap-4 lg:mt-16 lg:grid-cols-3">
              <div
                className="pointer-events-none absolute left-[16%] right-[16%] top-10 hidden h-px bg-gradient-to-r from-brand-500/10 via-brand-400/40 to-emerald-400/20 lg:block"
                aria-hidden
              />
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <Reveal key={step.number} delay={index * 90}>
                    <div className="relative h-full rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur transition duration-300 hover:border-white/20 hover:bg-white/[0.06] sm:p-7">
                      <div className="flex items-center justify-between">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.06] text-brand-300 ring-1 ring-inset ring-white/10">
                          <Icon className="h-5 w-5" aria-hidden />
                        </span>
                        <span className="font-serif text-3xl text-white/[0.15]">{step.number}</span>
                      </div>
                      <h3 className="mt-6 text-lg font-semibold tracking-tight text-white">{step.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-400">{step.copy}</p>
                      <span className="mt-5 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        {step.detail}
                      </span>
                    </div>
                  </Reveal>
                );
              })}
            </div>

            <Reveal className="mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 sm:flex-row sm:px-6" delay={120}>
              <p className="text-sm text-slate-300">
                <span className="font-semibold text-white">Ready to see the whole workflow?</span> The demo workspace is
                already set up.
              </p>
              <Link
                to="/login"
                className="group inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-semibold text-slate-950 transition hover:bg-brand-50"
              >
                Open the demo
                <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </Reveal>
          </div>
        </section>

        <section id="security" className="bg-white py-20 sm:py-24 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Reveal>
              <div className="relative overflow-hidden rounded-[2rem] bg-[#0a111f] p-7 text-white shadow-[0_30px_80px_-40px_rgba(15,23,42,0.9)] sm:p-10 lg:p-14">
                <div className="pointer-events-none absolute inset-0 marketing-grid opacity-[0.12]" aria-hidden />
                <div
                  className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl"
                  aria-hidden
                />
                <div className="relative grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
                  <div>
                    <Eyebrow light>Security &amp; control</Eyebrow>
                    <h2 className="mt-4 text-balance font-serif text-3xl font-normal tracking-[-0.025em] text-white sm:text-4xl lg:text-[2.7rem] lg:leading-[1.07]">
                      Client data deserves more than a login screen.
                    </h2>
                    <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-400">
                      Accountant OS is built around least-privilege access and traceable actions — so
                      confidentiality is part of the architecture, not a policy PDF.
                    </p>
                    <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/[0.15] bg-emerald-400/[0.06] px-3 py-1.5 text-[10px] font-semibold text-emerald-300">
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                      Deploy on infrastructure you control
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {securityItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.title}
                          className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-white/20 hover:bg-white/[0.06]"
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-brand-300 ring-1 ring-inset ring-white/10">
                            <Icon className="h-4 w-4" aria-hidden />
                          </span>
                          <h3 className="mt-3 text-sm font-semibold text-white">{item.title}</h3>
                          <p className="mt-1 text-xs leading-relaxed text-slate-400">{item.copy}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="relative mt-9 flex flex-col gap-2 border-t border-white/10 pt-5 text-[11px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                  <span>Client context is enforced at the API layer.</span>
                  <span className="inline-flex items-center gap-1.5 text-slate-400">
                    <Fingerprint className="h-3.5 w-3.5 text-brand-300" aria-hidden />
                    Every action attributable
                  </span>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section id="faq" className="bg-[#f7f6f2] py-20 sm:py-24 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
              <Reveal className="self-start lg:sticky lg:top-28">
                <Eyebrow>Questions</Eyebrow>
                <h2 className="mt-4 text-balance font-serif text-3xl font-normal tracking-[-0.025em] text-slate-900 sm:text-4xl lg:text-[2.9rem] lg:leading-[1.06]">
                  The answers firms ask for.
                </h2>
                <p className="mt-4 max-w-sm text-base leading-relaxed text-slate-600">
                  The fastest way to understand Accountant OS is to open the demo and click through a real client
                  workspace.
                </p>
                <Link
                  to="/login"
                  className="group mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-800"
                >
                  Open the demo workspace
                  <ArrowUpRight className="h-4 w-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </Reveal>

              <Reveal delay={80}>
                <div className="border-t border-slate-300/70">
                  {faqs.map((faq) => (
                    <details key={faq.q} className="group border-b border-slate-300/70">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left [&::-webkit-details-marker]:hidden">
                        <span className="text-sm font-semibold text-slate-900 transition group-hover:text-brand-700">
                          {faq.q}
                        </span>
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 transition group-open:rotate-45 group-open:border-brand-200 group-open:text-brand-600">
                          <PlusIcon />
                        </span>
                      </summary>
                      <p className="pb-5 pr-10 text-sm leading-relaxed text-slate-600">{faq.a}</p>
                    </details>
                  ))}
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#070b14] py-20 text-white sm:py-24 lg:py-28">
          <div className="pointer-events-none absolute inset-0 marketing-grid opacity-[0.14]" aria-hidden />
          <div
            className="pointer-events-none absolute left-1/2 top-0 h-80 w-[46rem] -translate-x-1/2 rounded-full bg-brand-600/25 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-40 right-0 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl"
            aria-hidden
          />
          <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
            <Reveal>
              <Eyebrow light>Start with one client</Eyebrow>
              <h2 className="mt-4 text-balance font-serif text-4xl font-normal tracking-[-0.03em] text-white sm:text-5xl lg:text-[3.6rem] lg:leading-[1.03]">
                Your next close could feel a lot calmer.
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-400">
                Bring your first client in today. The workspace, chart of accounts, and compliance setup are ready
                when you are.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  to={primaryTo}
                  className="group inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3.5 text-sm font-semibold text-slate-950 shadow-xl shadow-slate-950/30 transition hover:bg-brand-50"
                >
                  {primaryLabel}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
                <Link
                  to="/login"
                  className="group inline-flex items-center justify-center gap-2 rounded-full border border-white/[0.15] bg-white/[0.04] px-5 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:border-white/25 hover:bg-white/[0.08]"
                >
                  Explore the demo
                  <ArrowUpRight className="h-4 w-4 text-slate-400 transition group-hover:text-white" aria-hidden />
                </Link>
              </div>
              <div className="mt-7 inline-flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[11px] text-slate-400 sm:flex-row sm:gap-3">
                <span className="font-semibold uppercase tracking-[0.14em] text-slate-400">Demo workspace</span>
                <span className="font-mono text-[10px] text-slate-400">owner@demo-firm.test · Password123!</span>
                <Link to="/login" className="font-semibold text-brand-300 hover:text-brand-200">
                  Open demo
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#070b14] pb-8 pt-14 text-slate-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <div>
              <BrandMark />
              <p className="mt-5 max-w-xs text-sm leading-relaxed text-slate-400">
                The operating system for modern accounting practices. Books, compliance, client work, and AI-assisted
                review in one auditable workspace.
              </p>
              <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                21 modules · One ledger
              </p>
            </div>

            {footerColumns.map((column) => (
              <div key={column.title}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{column.title}</p>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) =>
                    link.to ? (
                      <li key={link.label}>
                        <Link
                          to={link.to}
                          className="text-sm text-slate-400 transition hover:text-white"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ) : (
                      <li key={link.label}>
                        <a
                          href={link.href}
                          className="text-sm text-slate-400 transition hover:text-white"
                        >
                          {link.label}
                        </a>
                      </li>
                    ),
                  )}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-[11px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Professional Accountant OS. All rights reserved.</p>
            <p className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
              Built around the ledger.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className="h-3.5 w-3.5">
      <path d="M8 3.25v9.5M3.25 8h9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

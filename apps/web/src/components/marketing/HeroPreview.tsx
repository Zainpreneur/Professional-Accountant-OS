import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  LayoutDashboard,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

const bars = [38, 56, 48, 66, 58, 78, 70, 88, 80, 94, 86, 100];

const clients = [
  { initials: "NW", name: "Northwind Trading", category: "Retail", status: "Active", tone: "emerald" },
  { initials: "AV", name: "Avenue Consulting", category: "Services", status: "Review", tone: "amber" },
  { initials: "HL", name: "Harbor Logistics", category: "Logistics", status: "Active", tone: "emerald" },
];

const toneClasses: Record<string, string> = {
  brand: "bg-brand-50 text-brand-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  sky: "bg-sky-50 text-sky-600",
};

const pillClasses: Record<string, string> = {
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
};

function MiniKpi({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Users;
  tone: keyof typeof toneClasses;
}) {
  return (
    <div className="rounded-lg border border-slate-200/80 bg-white p-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-1">
        <p className="truncate text-[7px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded ${toneClasses[tone]}`}>
          <Icon className="h-2.5 w-2.5" aria-hidden />
        </span>
      </div>
      <p className="mt-1 text-[13px] font-semibold leading-none tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 truncate text-[7px] text-slate-400">{hint}</p>
    </div>
  );
}

export function HeroPreview() {
  return (
    <div
      className="relative"
      role="img"
      aria-label="Illustrative preview of the Accountant OS firm dashboard, showing client metrics, revenue, compliance deadlines, and a client portfolio."
    >
      <div
        className="pointer-events-none absolute -inset-10 rounded-full bg-[radial-gradient(closest-side,rgba(50,119,246,0.30),rgba(16,185,129,0.10),transparent)] blur-2xl"
        aria-hidden
      />

      <div className="hero-preview-tilt relative" aria-hidden="true">
        <div className="relative rounded-[1.35rem] border border-white/[0.15] bg-white/10 p-1.5 shadow-[0_40px_120px_-28px_rgba(0,0,0,0.85)] backdrop-blur-sm">
          <div className="overflow-hidden rounded-[0.95rem] border border-white/10 bg-slate-950">
            <div className="flex items-center gap-3 border-b border-white/10 bg-[#0b1322] px-4 py-2.5">
              <div className="flex gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-400/80" />
                <span className="h-2 w-2 rounded-full bg-amber-300/80" />
                <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
              </div>
              <div className="mx-auto flex items-center gap-1.5 rounded-md bg-white/[0.04] px-3 py-1 text-[8px] font-medium text-slate-400 ring-1 ring-inset ring-white/10">
                <LockKeyhole className="h-2.5 w-2.5" />
                app.accountant-os.com
              </div>
              <div className="w-8" />
            </div>

            <div className="flex bg-[#f3f6fb] text-slate-900">
              <div className="hidden w-12 shrink-0 flex-col items-center gap-2 bg-[#0a111f] py-3 sm:flex">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-950/40">
                  <BookOpen className="h-3.5 w-3.5" />
                </span>
                <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-md bg-brand-500/20 text-brand-300 ring-1 ring-inset ring-brand-400/20">
                  <LayoutDashboard className="h-3.5 w-3.5" />
                </span>
                {[Users, BookOpen, ReceiptText, ShieldCheck, Sparkles].map((Icon, index) => (
                  <span key={index} className="flex h-6 w-6 items-center justify-center rounded-md text-slate-500">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                ))}
                <span className="mt-auto flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[7px] font-semibold text-slate-300">
                  FA
                </span>
              </div>

              <div className="min-w-0 flex-1 p-3 sm:p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[7px] font-semibold uppercase tracking-[0.18em] text-brand-600">Firm overview</p>
                    <p className="mt-0.5 text-[13px] font-semibold tracking-tight text-slate-900">Good morning, Farah</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="hidden rounded-md border border-slate-200 bg-white px-2 py-1 text-[7px] font-medium text-slate-500 sm:inline-flex">
                      Oct 2026
                    </span>
                    <div className="flex -space-x-1.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#f3f6fb] bg-brand-100 text-[6px] font-bold text-brand-700">
                        FA
                      </span>
                      <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#f3f6fb] bg-emerald-100 text-[6px] font-bold text-emerald-700">
                        SK
                      </span>
                      <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#f3f6fb] bg-slate-200 text-[6px] font-bold text-slate-600">
                        +4
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  <MiniKpi label="Clients" value="24" hint="+3 this month" icon={Users} tone="brand" />
                  <MiniKpi label="Open AR" value="SAR 84.2k" hint="68% current" icon={BarChart3} tone="sky" />
                  <MiniKpi label="VAT due" value="4 days" hint="Q3 return" icon={ReceiptText} tone="amber" />
                  <MiniKpi label="Review queue" value="12" hint="2 high priority" icon={Sparkles} tone="emerald" />
                </div>

                <div className="mt-1.5 grid gap-1.5 sm:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-lg border border-slate-200/80 bg-white p-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                    <div className="flex items-center justify-between">
                      <p className="text-[8px] font-semibold text-slate-700">Practice revenue</p>
                      <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[6px] font-bold text-emerald-700">
                        +12.4%
                      </span>
                    </div>
                    <p className="mt-0.5 text-[14px] font-semibold tracking-tight text-slate-900">SAR 1.24M</p>
                    <div className="relative mt-1.5 flex h-12 items-end gap-[3px]">
                      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
                        <span className="border-t border-dashed border-slate-100" />
                        <span className="border-t border-dashed border-slate-100" />
                        <span className="border-t border-dashed border-slate-100" />
                      </div>
                      {bars.map((height, index) => (
                        <span
                          key={index}
                          className={`relative flex-1 rounded-t-[2px] ${
                            index === bars.length - 1
                              ? "bg-gradient-to-t from-brand-600 to-brand-400"
                              : "bg-brand-100"
                          }`}
                          style={{ height: `${height}%` }}
                        />
                      ))}
                    </div>
                    <div className="mt-1 flex justify-between text-[6px] text-slate-400">
                      <span>Jan</span>
                      <span>Jun</span>
                      <span>Dec</span>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200/80 bg-white p-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                    <div className="flex items-center justify-between">
                      <p className="text-[8px] font-semibold text-slate-700">Compliance</p>
                      <span className="text-[6px] font-medium text-slate-400">Next 30 days</span>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {[
                        { label: "VAT · Q3", meta: "9 days", dot: "bg-amber-400", metaClass: "text-amber-600" },
                        { label: "WHT · Sep", meta: "Filed", dot: "bg-emerald-500", metaClass: "text-emerald-600" },
                        { label: "Zakat · FY26", meta: "Upcoming", dot: "bg-slate-300", metaClass: "text-slate-400" },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center gap-1.5">
                          <span className={`h-1.5 w-1.5 rounded-full ${item.dot}`} />
                          <span className="min-w-0 flex-1 truncate text-[7px] font-medium text-slate-600">
                            {item.label}
                          </span>
                          <span className={`text-[6px] font-semibold ${item.metaClass}`}>{item.meta}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 rounded-md bg-slate-50 px-1.5 py-1 text-[6px] leading-relaxed text-slate-500">
                      <span className="font-semibold text-slate-700">8 clients</span> have deadlines this month.
                    </div>
                  </div>
                </div>

                <div className="mt-1.5 rounded-lg border border-slate-200/80 bg-white px-2.5 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                  <div className="flex items-center justify-between">
                    <p className="text-[8px] font-semibold text-slate-700">Client portfolio</p>
                    <span className="text-[6px] font-medium text-brand-600">View all</span>
                  </div>
                  <div className="mt-1.5 space-y-1">
                    {clients.map((client) => (
                      <div key={client.initials} className="flex items-center gap-1.5">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-slate-100 text-[5px] font-bold text-slate-600">
                          {client.initials}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[7px] font-medium text-slate-700">
                          {client.name}
                        </span>
                        <span className="hidden text-[6px] text-slate-400 sm:inline">{client.category}</span>
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[5px] font-bold uppercase tracking-wide ring-1 ring-inset ${pillClasses[client.tone]}`}
                        >
                          {client.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="marketing-float absolute -right-3 top-20 hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-xl shadow-slate-950/20 sm:flex lg:-right-8">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-[9px] font-semibold text-slate-900">VAT return filed</span>
            <span className="block text-[8px] text-slate-500">Q3 · SAR 12,840</span>
          </span>
        </div>

        <div className="marketing-float-delayed absolute -left-3 bottom-16 hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-xl shadow-slate-950/20 sm:flex lg:-left-8">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <Sparkles className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-[9px] font-semibold text-slate-900">AI review ready</span>
            <span className="block text-[8px] text-slate-500">12 findings · human sign-off</span>
          </span>
        </div>
      </div>
    </div>
  );
}

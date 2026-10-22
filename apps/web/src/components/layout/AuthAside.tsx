import type { LucideIcon } from "lucide-react";
import { BookOpenCheck } from "lucide-react";

export function AuthAside({
  headline,
  description,
  points,
}: {
  headline: string;
  description: string;
  points: Array<{ icon: LucideIcon; text: string }>;
}) {
  return (
    <div className="relative hidden overflow-hidden bg-slate-950 lg:flex lg:w-1/2 lg:flex-col lg:justify-between lg:p-12">
      <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-brand-600/20 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-[30rem] w-[30rem] rounded-full bg-emerald-500/10 blur-3xl" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
        aria-hidden
      />

      <div className="relative flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-900/50">
          <BookOpenCheck className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-semibold text-white">Professional Accountant OS</p>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">Practice operating system</p>
        </div>
      </div>

      <div className="relative max-w-lg">
        <h2 className="text-3xl font-semibold leading-tight tracking-tight text-white xl:text-4xl">{headline}</h2>
        <p className="mt-4 text-sm leading-relaxed text-slate-400">{description}</p>

        <ul className="mt-8 space-y-4">
          {points.map((point) => (
            <li key={point.text} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-brand-300 ring-1 ring-white/10">
                <point.icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="pt-1.5 text-sm text-slate-300">{point.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative flex items-center gap-8 border-t border-white/10 pt-6">
        <div>
          <p className="text-lg font-semibold text-white">21</p>
          <p className="text-[11px] uppercase tracking-wider text-slate-500">Connected modules</p>
        </div>
        <div className="h-8 w-px bg-white/10" />
        <div>
          <p className="text-lg font-semibold text-white">Multi-entity</p>
          <p className="text-[11px] uppercase tracking-wider text-slate-500">Client workspaces</p>
        </div>
        <div className="h-8 w-px bg-white/10" />
        <div>
          <p className="text-lg font-semibold text-white">Audit-ready</p>
          <p className="text-[11px] uppercase tracking-wider text-slate-500">By default</p>
        </div>
      </div>
    </div>
  );
}

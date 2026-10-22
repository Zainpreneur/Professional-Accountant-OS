import { Link } from "react-router-dom";
import { ArrowLeft, Compass } from "lucide-react";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

export function NotFoundPage() {
  useDocumentTitle("Page not found · Accountant OS");
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-card ring-1 ring-slate-200">
          <Compass className="h-6 w-6" aria-hidden />
        </span>
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Error 404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Page not found</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          The page you are looking for may have moved, or the link may be incomplete. Head back to your workspace to pick
          up where you left off.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-2 sm:flex-row">
          <Link
            to="/dashboard"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to workspace
          </Link>
          <Link
            to="/login"
            className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:w-auto"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

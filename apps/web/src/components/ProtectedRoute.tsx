import { Navigate, Outlet } from "react-router-dom";
import { BookOpenCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";

export function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <span className="flex h-12 w-12 animate-pulse items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-500/30">
            <BookOpenCheck className="h-6 w-6" aria-hidden />
          </span>
          <p className="text-sm font-medium text-slate-500">Loading your workspace…</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return <Outlet />;
}

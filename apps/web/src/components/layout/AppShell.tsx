import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  BookOpenCheck,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  X,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn, initials } from "@/lib/format";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

interface ClientSummary {
  id: string;
  legalName: string;
  tradingName: string | null;
  status: string;
}

export function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [clients, setClients] = useState<ClientSummary[] | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    let cancelled = false;
    api<ClientSummary[]>("/clients")
      .then((rows) => !cancelled && setClients(rows))
      .catch(() => !cancelled && setClients([]));
    return () => {
      cancelled = true;
    };
  }, []);

  const clientMatch = location.pathname.match(/\/dashboard\/clients\/([^/]+)/);
  const activeClientId = clientMatch?.[1];
  const activeClient = clients?.find((client) => client.id === activeClientId);

  useDocumentTitle(activeClient ? `${activeClient.legalName} · Accountant OS` : "Firm overview · Accountant OS");

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link to="/dashboard" className="flex items-center gap-3 px-5 py-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-900/40">
          <BookOpenCheck className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-white">Accountant OS</span>
          <span className="block truncate text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
            Practice workspace
          </span>
        </span>
      </Link>

      <nav className="px-3">
        <p className="px-2 pb-2 pt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Workspace</p>
        <SidebarLink to="/dashboard" end icon={LayoutDashboard} label="Dashboard" />
      </nav>

      <div className="mt-5 flex min-h-0 flex-1 flex-col px-3">
        <div className="flex items-center justify-between px-2 pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Clients</p>
          {clients && <span className="text-[10px] font-semibold text-slate-500">{clients.length}</span>}
        </div>

        <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto pb-4">
          {clients === null &&
            [0, 1, 2].map((i) => <div key={i} className="mx-2 my-2 h-8 animate-pulse rounded-lg bg-white/5" />)}

          {clients?.length === 0 && (
            <p className="px-2 py-2 text-xs leading-relaxed text-slate-500">
              No clients yet. Create your first client from the dashboard.
            </p>
          )}

          {clients?.map((client) => {
            const active = client.id === activeClientId;
            return (
              <Link
                key={client.id}
                to={`/dashboard/clients/${client.id}`}
                className={cn(
                  "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition",
                  active ? "bg-white/10 text-white ring-1 ring-white/10" : "text-slate-400 hover:bg-white/5 hover:text-white",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold uppercase",
                    active ? "bg-brand-500 text-white" : "bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-white",
                  )}
                >
                  {client.legalName.slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{client.legalName}</span>
                  {client.tradingName && <span className="block truncate text-[11px] text-slate-500">{client.tradingName}</span>}
                </span>
                {active && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-brand-300" />}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-[11px] font-bold text-white">
            {initials(user?.firstName, user?.lastName)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-white">
              {user?.firstName} {user?.lastName}
            </span>
            <span className="block truncate text-[11px] text-slate-500">{user?.email}</span>
          </span>
          <button
            type="button"
            onClick={logout}
            className="ghost p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 lg:block">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} aria-hidden />
          <div className="relative h-full w-72 max-w-[85vw] bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 shadow-pop">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="absolute right-3 top-4 z-10 ghost p-2 text-slate-400 hover:bg-white/10 hover:text-white"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      <div className="flex min-h-screen flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/85 px-4 backdrop-blur lg:px-8">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="ghost -ml-2 p-2 lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
              <Link to="/dashboard" className="text-slate-400 hover:text-slate-700">
                Workspace
              </Link>
              <ChevronRight className="h-3 w-3" />
              {activeClient ? (
                <>
                  <Link to="/dashboard" className="text-slate-400 hover:text-slate-700">
                    Clients
                  </Link>
                  <ChevronRight className="h-3 w-3" />
                  <span className="truncate text-slate-600">{activeClient.legalName}</span>
                </>
              ) : (
                <span className="text-slate-600">Dashboard</span>
              )}
            </div>
            <p className="truncate text-sm font-semibold text-slate-800">
              {activeClient ? activeClient.legalName : "Firm overview"}
            </p>
          </div>

          <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200 sm:inline-flex">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            {user?.firmWidePermissions.includes("MANAGE_FIRM") ? "Firm admin" : "Team member"}
          </span>

          <div className="hidden h-8 w-px bg-slate-200 sm:block" />

          <div className="flex items-center gap-2">
            <span className="hidden text-right sm:block">
              <span className="block text-xs font-semibold text-slate-800">
                {user?.firstName} {user?.lastName}
              </span>
              <span className="block text-[11px] text-slate-400">{user?.email}</span>
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
              {initials(user?.firstName, user?.lastName)}
            </span>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1400px] animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarLink({
  to,
  label,
  icon: Icon,
  end,
}: {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition",
          isActive ? "bg-white/10 text-white ring-1 ring-white/10" : "text-slate-400 hover:bg-white/5 hover:text-white",
        )
      }
    >
      <Icon className="h-4 w-4" aria-hidden />
      {label}
    </NavLink>
  );
}

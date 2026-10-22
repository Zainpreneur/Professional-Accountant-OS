import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  BookOpen,
  Building2,
  CalendarClock,
  ChevronRight,
  Globe2,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { humanize, formatDate } from "@/lib/format";
import {
  Alert,
  Button,
  EmptyState,
  Field,
  LoadingState,
  Modal,
  PageHeader,
  Spinner,
  StatCard,
  StatusBadge,
} from "@/components/ui";

interface Client {
  id: string;
  legalName: string;
  tradingName: string | null;
  businessCategory: string | null;
  jurisdiction: string;
  status: string;
  createdAt: string;
}

interface BusinessCategory {
  code: string;
  label: string;
  description: string;
  extraAccountCount: number;
}

interface Jurisdiction {
  code: string;
  label: string;
  currency: string;
  requiresVat: boolean;
  requiresWht: boolean;
  requiresZakat: boolean;
  extraAccountCount: number;
}

const EMPTY_FORM = {
  legalName: "",
  tradingName: "",
  entityType: "",
  businessCategory: "PROFESSIONAL_SERVICES",
  jurisdiction: "SA",
  taxRegistrationNumber: "",
};

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[] | null>(null);
  const [categories, setCategories] = useState<BusinessCategory[]>([]);
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  async function load() {
    try {
      setLoadError(null);
      const [clientRows, categoryRows, jurisdictionRows] = await Promise.all([
        api<Client[]>("/clients"),
        api<BusinessCategory[]>("/business-compiler/categories"),
        api<Jurisdiction[]>("/business-compiler/jurisdictions"),
      ]);
      setClients(clientRows);
      setCategories(categoryRows);
      setJurisdictions(jurisdictionRows);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Failed to load clients");
      setClients([]);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const selectedCategory = categories.find((category) => category.code === form.businessCategory);
  const selectedJurisdiction = jurisdictions.find((jurisdiction) => jurisdiction.code === form.jurisdiction);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openCreate() {
    setFormError(null);
    setShowForm(true);
  }

  function closeCreate() {
    if (submitting) return;
    setShowForm(false);
    setFormError(null);
  }

  async function onCreate(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const created = await api<Client>("/clients", { method: "POST", body: form });
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
      if (created?.id) navigate(`/dashboard/clients/${created.id}`);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Failed to create client");
    } finally {
      setSubmitting(false);
    }
  }

  const statuses = useMemo(
    () => Array.from(new Set((clients ?? []).map((client) => client.status))).sort(),
    [clients],
  );

  const filteredClients = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (clients ?? []).filter((client) => {
      const matchesStatus = statusFilter === "ALL" || client.status === statusFilter;
      const matchesQuery =
        !term ||
        client.legalName.toLowerCase().includes(term) ||
        (client.tradingName ?? "").toLowerCase().includes(term) ||
        (client.businessCategory ?? "").toLowerCase().includes(term);
      return matchesStatus && matchesQuery;
    });
  }, [clients, query, statusFilter]);

  const totalClients = clients?.length ?? 0;
  const activeClients = clients?.filter((client) => client.status === "ACTIVE").length ?? 0;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const newThisMonth =
    clients?.filter((client) => new Date(client.createdAt).getTime() >= monthStart.getTime()).length ?? 0;
  const jurisdictionCount = new Set((clients ?? []).map((client) => client.jurisdiction)).size;

  const latestClient = useMemo(() => {
    if (!clients?.length) return null;
    return [...clients].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  }, [clients]);

  return (
    <div className="page">
      <PageHeader
        eyebrow={`Welcome back${user?.firstName ? `, ${user.firstName}` : ""}`}
        title="Firm overview"
        description="Your client portfolio, onboarding pipeline, and practice shortcuts in one place."
        actions={
          <>
            <span className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500 shadow-sm sm:inline-flex">
              <CalendarClock className="h-4 w-4 text-slate-400" aria-hidden />
              {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date())}
            </span>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" aria-hidden />
              New client
            </Button>
          </>
        }
      />

      {loadError && <Alert>{loadError}</Alert>}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Clients"
          value={clients === null ? "—" : totalClients}
          hint={clients === null ? "Loading portfolio…" : `${filteredClients.length} in current view`}
          icon={Users}
          tone="brand"
        />
        <StatCard
          label="Active clients"
          value={clients === null ? "—" : activeClients}
          hint={totalClients ? `${Math.round((activeClients / totalClients) * 100)}% of the portfolio` : "No clients yet"}
          icon={ShieldCheck}
          tone="emerald"
        />
        <StatCard
          label="New this month"
          value={clients === null ? "—" : newThisMonth}
          hint="Onboarded since the 1st"
          icon={TrendingUp}
          tone="amber"
        />
        <StatCard
          label="Jurisdictions"
          value={clients === null ? "—" : jurisdictionCount}
          hint={jurisdictions.length ? `${jurisdictions.length} supported in total` : "Across your clients"}
          icon={Globe2}
          tone="slate"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section id="clients" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2>Client portfolio</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {clients === null ? "Fetching clients…" : `${filteredClients.length} of ${totalClients} clients`}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search clients"
                  className="w-full pl-9 sm:w-56"
                  aria-label="Search clients"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full sm:w-40"
                aria-label="Filter by status"
              >
                <option value="ALL">All statuses</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {humanize(status)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {clients === null ? (
            <div className="p-5">
              <LoadingState label="Loading your client portfolio…" />
            </div>
          ) : clients.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={Building2}
                title="No clients yet"
                description="Create your first client to generate its chart of accounts, compliance calendar, and workspace."
                action={
                  <Button onClick={openCreate}>
                    <Plus className="h-4 w-4" aria-hidden />
                    Create your first client
                  </Button>
                }
              />
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={Search}
                title="No clients match"
                description="Try a different name or clear the status filter."
                action={
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setQuery("");
                      setStatusFilter("ALL");
                    }}
                  >
                    Clear filters
                  </Button>
                }
              />
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table>
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Category</th>
                      <th>Jurisdiction</th>
                      <th>Status</th>
                      <th>Onboarded</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.map((client) => (
                      <tr key={client.id} className="cursor-pointer" onClick={() => navigate(`/dashboard/clients/${client.id}`)}>
                        <td>
                          <Link
                            to={`/dashboard/clients/${client.id}`}
                            className="flex items-center gap-3 font-semibold text-slate-900 hover:text-brand-700"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-bold uppercase text-slate-600">
                              {client.legalName.slice(0, 2)}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate">{client.legalName}</span>
                              {client.tradingName && (
                                <span className="block truncate text-xs font-normal text-slate-500">{client.tradingName}</span>
                              )}
                            </span>
                          </Link>
                        </td>
                        <td className="text-slate-600">{humanize(client.businessCategory)}</td>
                        <td>
                          <span className="chip">{client.jurisdiction}</span>
                        </td>
                        <td>
                          <StatusBadge status={client.status} />
                        </td>
                        <td className="text-slate-500">{formatDate(client.createdAt)}</td>
                        <td>
                          <ChevronRight className="h-4 w-4 text-slate-300" aria-hidden />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-slate-100 md:hidden">
                {filteredClients.map((client) => (
                  <li key={client.id}>
                    <Link to={`/dashboard/clients/${client.id}`} className="flex items-center gap-3 px-5 py-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold uppercase text-slate-600">
                        {client.legalName.slice(0, 2)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-900">{client.legalName}</span>
                        <span className="mt-0.5 block truncate text-xs text-slate-500">
                          {humanize(client.businessCategory)} · {client.jurisdiction}
                        </span>
                      </span>
                      <StatusBadge status={client.status} />
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <p className="section-heading">Quick actions</p>
            <div className="mt-3 space-y-1">
              <button type="button" onClick={openCreate} className="ghost w-full justify-start px-2.5 py-2 font-medium">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Plus className="h-4 w-4" aria-hidden />
                </span>
                Onboard a new client
                <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-slate-400" aria-hidden />
              </button>

              {latestClient ? (
                <>
                  <Link
                    to={`/dashboard/clients/${latestClient.id}/journals`}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                      <BookOpen className="h-4 w-4" aria-hidden />
                    </span>
                    Post a journal
                    <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-slate-400" aria-hidden />
                  </Link>
                  <Link
                    to={`/dashboard/clients/${latestClient.id}/compliance`}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                      <CalendarClock className="h-4 w-4" aria-hidden />
                    </span>
                    Compliance calendar
                    <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-slate-400" aria-hidden />
                  </Link>
                  <Link
                    to={`/dashboard/clients/${latestClient.id}/ai-agents`}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                      <Sparkles className="h-4 w-4" aria-hidden />
                    </span>
                    Review AI queue
                    <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-slate-400" aria-hidden />
                  </Link>
                </>
              ) : (
                <p className="px-2.5 py-2 text-xs leading-relaxed text-slate-500">
                  Shortcuts to journals, compliance, and AI reviews appear once you add a client.
                </p>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-950 p-5 text-slate-300 shadow-card">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-300">Business compiler</p>
            <h3 className="mt-2 text-base font-semibold text-white">Onboarding, handled</h3>
            <ol className="mt-4 space-y-3 text-xs leading-relaxed">
              <li className="flex gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white">
                  1
                </span>
                <span>Answer a few questions about the entity, category, and jurisdiction.</span>
              </li>
              <li className="flex gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white">
                  2
                </span>
                <span>We generate the opening chart of accounts and tax-specific ledgers.</span>
              </li>
              <li className="flex gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white">
                  3
                </span>
                <span>Invite the team and start posting — every change is audit-logged.</span>
              </li>
            </ol>
          </div>
        </aside>
      </div>

      <Modal
        open={showForm}
        onClose={closeCreate}
        title="Onboard a new client"
        description="The Business Compiler will create the opening ledger and compliance setup."
        size="lg"
        footer={
          <>
            <Button variant="secondary" type="button" onClick={closeCreate} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" form="new-client-form" disabled={submitting}>
              {submitting ? <Spinner /> : <Plus className="h-4 w-4" aria-hidden />}
              {submitting ? "Creating client…" : "Create client"}
            </Button>
          </>
        }
      >
        <form id="new-client-form" onSubmit={onCreate} className="space-y-4">
          {formError && <Alert>{formError}</Alert>}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Legal name" required>
              <input
                required
                value={form.legalName}
                onChange={(event) => update("legalName", event.target.value)}
                placeholder="Northwind Trading LLC"
                className="w-full"
              />
            </Field>
            <Field label="Trading name">
              <input
                value={form.tradingName}
                onChange={(event) => update("tradingName", event.target.value)}
                placeholder="Northwind"
                className="w-full"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Entity type" hint="For example LLC, sole establishment, or branch.">
              <input
                value={form.entityType}
                onChange={(event) => update("entityType", event.target.value)}
                placeholder="LLC"
                className="w-full"
              />
            </Field>
            <Field label="Tax registration number">
              <input
                value={form.taxRegistrationNumber}
                onChange={(event) => update("taxRegistrationNumber", event.target.value)}
                placeholder="300000000000003"
                className="w-full"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Business category">
              <select
                value={form.businessCategory}
                onChange={(event) => update("businessCategory", event.target.value)}
                className="w-full"
              >
                {categories.length === 0 && <option value="PROFESSIONAL_SERVICES">Professional services</option>}
                {categories.map((category) => (
                  <option key={category.code} value={category.code}>
                    {category.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Jurisdiction">
              <select
                value={form.jurisdiction}
                onChange={(event) => update("jurisdiction", event.target.value)}
                className="w-full"
              >
                {jurisdictions.length === 0 && <option value="SA">Saudi Arabia</option>}
                {jurisdictions.map((jurisdiction) => (
                  <option key={jurisdiction.code} value={jurisdiction.code}>
                    {jurisdiction.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {(selectedCategory || selectedJurisdiction) && (
            <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-4 text-xs leading-relaxed text-brand-950">
              <p className="font-semibold text-brand-900">What will be created</p>
              {selectedCategory && <p className="mt-1">{selectedCategory.description}</p>}
              {selectedJurisdiction && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="chip bg-white/80 text-brand-800">
                    Currency {selectedJurisdiction.currency}
                  </span>
                  {selectedJurisdiction.requiresVat && <span className="chip bg-white/80 text-brand-800">VAT</span>}
                  {selectedJurisdiction.requiresWht && <span className="chip bg-white/80 text-brand-800">WHT</span>}
                  {selectedJurisdiction.requiresZakat && (
                    <span className="chip bg-white/80 text-brand-800">Zakat</span>
                  )}
                </div>
              )}
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}

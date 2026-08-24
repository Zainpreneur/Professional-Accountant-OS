# Architecture & Implementation Status

This document tracks what is actually built against the target in
[`docs/SRS.md`](./SRS.md), and how to run it. The SRS describes the full,
eventual Professional Accountant OS (99 sections, ~50 modules). Building all
of it at once was explicitly ruled out by the SRS itself (§98, "Do not
attempt to build all 50 modules simultaneously") — this repository
implements **Phase 1: Professional Foundation**, as real, running,
tested code, and leaves Phases 2-6 as a concrete roadmap below.

## Stack

| Layer | Choice | Why |
|---|---|---|
| API | NestJS + TypeScript | Module/DI structure maps directly onto the SRS's domain modules (accounting, tax, audit, ...); mainstream, well-documented. |
| Database | PostgreSQL + Prisma | SRS §64 calls for PostgreSQL with strong relational integrity, UUIDs, constraints. Prisma gives type-safe queries and migrations. |
| Auth | JWT (passport-jwt) + bcrypt | Stateless, simple to run anywhere. |
| Frontend | Next.js (App Router) + React | SRS §85 wants a desktop-optimized firm workspace and a responsive client portal from one codebase. |
| Monorepo | pnpm workspaces | `apps/api`, `apps/web`, `packages/db` share the Prisma-generated types. |

No infra beyond Postgres is required to run Phase 1 locally.

## What's implemented (Phase 1)

Maps to SRS §98 Phase 1 ("Professional Foundation") plus the minimum slice
of §§4, 56, 65 needed to make it trustworthy:

- **Multi-tenancy & RBAC** (SRS §§3, 5, 53-55): `Firm → User → Role →
  UserRole`, with roles assignable firm-wide or scoped to one `Client`.
  Every client-scoped route is guarded by `ClientTenantGuard`, which 404s
  (never 403s) on cross-firm access attempts. Permission codes mirror
  SRS §54 (`apps/api/src/rbac/permissions.ts`).
- **Client onboarding** (SRS §6): creating a `Client` provisions a starter
  chart of accounts, a fiscal year, and 12 monthly accounting periods in
  one transaction.
- **Accounting core** (SRS §§11-13, 65): chart of accounts, fiscal
  years/periods (OPEN/LOCKED/CLOSED), and a journal posting engine
  (`JournalsService`) that is the *only* code path allowed to write
  `JournalLine` rows. It enforces:
  - total debit === total credit on every journal (draft or posted),
  - no line may carry both a debit and a credit,
  - posting is rejected outside an OPEN accounting period,
  - a posted journal is never deleted or edited - only reversed, which
    posts a new fully-offsetting journal and marks the original
    `REVERSED` (still counted in every report - see `docs/ARCHITECTURE.md`
    note in `reports.service.ts`).
  This invariant is covered by an integration test suite
  (`apps/api/test/ledger.spec.ts`) against a real Postgres database.
- **AR / AP** (SRS §§14-15, 18-19): Customers/Suppliers, Invoices/Bills
  with line items, VAT computed per line. Posting an invoice/bill
  auto-generates its balancing journal (AR/AP control account vs. revenue
  or expense accounts vs. VAT Output/Input) inside one DB transaction.
- **Payments** (SRS §§14-17): receipts and payments allocate cash against
  one or more open invoices/bills, update their paid status, and post the
  bank-vs-control-account journal.
- **Reporting** (SRS §§29-30, 48-50, 86-87): Trial Balance, per-account GL
  ledger (with running balance), AR aging, AP aging - all computed live
  from posted journal lines, never from a cached/derived table.
- **Documents** (SRS §§40-41): upload/list/download with metadata in
  Postgres and files on local disk (swappable for object storage later
  without touching callers - see `DocumentsService`).
- **Audit trail** (SRS §56): every mutating action in every service above
  writes an `AuditLog` row (who/what/when/before/after), queryable via
  `GET /audit-logs`.
- **Client portal groundwork**: `ClientMember` models a client-side user's
  membership in a `Client`, and `UserRole.clientId` lets a role be scoped
  to just that client - the same RBAC mechanism serves both firm staff and
  future client-portal logins (SRS §7 UI itself is not yet built - see
  Roadmap).
- **Frontend**: firm registration/login, client list + onboarding form,
  per-client workspace (chart of accounts, journals with manual entry +
  post/reverse, customers, suppliers, invoices, bills, and a reports tab
  with trial balance + AR/AP aging).

### Deliberate Phase 1 simplifications

These are scoped out on purpose, not overlooked - each is a natural
Phase 2+ extension point:

- Journal numbering is `count(journals for client) + 1` inside the posting
  transaction - correct under normal single-writer usage, but not
  collision-proof under heavy concurrent writers (would need a DB
  sequence per client).
- Payments require full allocation (`sum(allocations) === amount`) - no
  on-account/unapplied cash yet.
- One base chart-of-accounts template for every new client (SRS §60's
  business-category templates and jurisdiction packs are not yet layered
  in).
- No inventory, fixed assets, payroll, tax/VAT/Zakat filing, audit
  workpapers, or AI agents yet (see Roadmap).

## Repository layout

```
apps/
  api/              NestJS backend
    src/
      auth/         JWT auth, register-firm, login
      rbac/         permissions, guards (PermissionsGuard, ClientTenantGuard)
      clients/      client onboarding + CRUD
      customers/    AR master data
      suppliers/    AP master data
      accounting/
        coa/        chart of accounts
        fiscal/     fiscal years & accounting periods
        journals/   the ledger posting engine
      sales/        invoices (posts to GL)
      purchases/    bills (posts to GL)
      payments/     receipts & payments (posts to GL, allocates to docs)
      reports/      trial balance, GL ledger, AR/AP aging
      documents/    upload/download + metadata
      audit/        audit log service + read endpoint
    test/           vitest integration tests against a real Postgres DB
  web/              Next.js frontend (firm workspace)
packages/
  db/               Prisma schema, migrations, seed script
docs/
  SRS.md            full consolidated requirements (target state)
  ARCHITECTURE.md   this file
```

## Running it locally

Requires Node 20+, pnpm, and a PostgreSQL server (via Docker if available,
otherwise any local Postgres 16 instance).

```bash
pnpm install
cp .env.example .env               # adjust DATABASE_URL if not using the default

# Start Postgres - either:
docker compose up -d               # if Docker is available, or
#   point DATABASE_URL in .env at any Postgres 16 instance you already have running

pnpm --filter @accountant-os/db exec prisma migrate deploy
pnpm db:seed                       # creates a demo firm + client
#   login: owner@demo-firm.test / Password123!

pnpm dev:api                       # http://localhost:4000/api/v1
pnpm dev:web                       # http://localhost:3000
```

Running the ledger integrity tests (uses `apps/api/.env.test` - point it at
a separate database, e.g. `accountant_os_test`, and run migrations against
it once):

```bash
DATABASE_URL=<test-db-url> pnpm --filter @accountant-os/db exec prisma migrate deploy
pnpm --filter @accountant-os/api test
```

## Roadmap (SRS §98 Phases 2-6)

Not built yet - listed here so scope is explicit rather than implied:

- **Phase 2 - Accounting automation**: bank feed import + reconciliation
  engine, OCR/document intelligence, AI transaction classification, fixed
  assets, inventory, payroll, expense management.
- **Phase 3 - Saudi compliance**: VAT return preparation, ZATCA
  e-invoicing (SRS §26), Zakat engine (SRS §27), withholding tax (SRS
  §28), the jurisdiction/regulatory rules engine (SRS §58) so rules are
  versioned data, not hard-coded logic, and the compliance calendar (SRS
  §47).
- **Phase 4 - Professional CA**: engagements, audit module (planning,
  risk, procedures, evidence, findings, completion - SRS §33-34),
  independence checks (SRS §36), the professional judgment engine (SRS
  §35), segregation-of-duties enforcement (SRS §55) beyond today's
  create/post permission split.
- **Phase 5 - AI workforce**: the 20 agents in SRS §37, all operating
  under the OBSERVE→...→RECORD EVIDENCE model (SRS §38) with the
  confidence/escalation contract in SRS §39 and the guardrails in SRS §67 -
  including the hard rule that AI never has final authority over a
  posting or professional conclusion (SRS §4).
- **Phase 6 - Universal Business Compiler**: jurisdiction/industry
  template packs (SRS §§59-60) that generate chart of accounts, forms,
  workflows, and dashboards from a client's country/category/framework
  instead of one fixed template.

Also not yet built, needed before any production deployment: the client
portal's own UI (client-facing views reusing the RBAC/tenancy already in
place), mobile apps (SRS §84), notification delivery (SRS §78, currently
just logged), MFA (SRS §53), and object storage for documents in place of
local disk.

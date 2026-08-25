# Architecture & Implementation Status

This document tracks what is actually built against the target in
[`docs/SRS.md`](./SRS.md), and how to run it. The SRS describes the full,
eventual Professional Accountant OS (99 sections, ~50 modules). Building all
of it at once was explicitly ruled out by the SRS itself (§98, "Do not
attempt to build all 50 modules simultaneously") — this repository
implements SRS §98's **Phase 1 (Professional Foundation)**,
**Phase 2 (Accounting Automation)**, **Phase 3 (Saudi Compliance)**, and
**Phase 4 (Professional CA)** as real, running, tested code, and leaves
Phases 5-6 as a concrete roadmap below.

## Stack

| Layer | Choice | Why |
|---|---|---|
| API | NestJS + TypeScript | Module/DI structure maps directly onto the SRS's domain modules (accounting, tax, audit, ...); mainstream, well-documented. |
| Database | PostgreSQL + Prisma | SRS §64 calls for PostgreSQL with strong relational integrity, UUIDs, constraints. Prisma gives type-safe queries and migrations. |
| Auth | JWT (passport-jwt) + bcrypt | Stateless, simple to run anywhere. |
| Frontend | Next.js (App Router) + React | SRS §85 wants a desktop-optimized firm workspace and a responsive client portal from one codebase. |
| Monorepo | pnpm workspaces | `apps/api`, `apps/web`, `packages/db` share the Prisma-generated types. |

No infra beyond Postgres is required to run this locally.

## What's implemented

### Phase 1 - Professional Foundation

Maps to SRS §98 Phase 1 plus the minimum slice of §§4, 56, 65 needed to
make it trustworthy:

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
    `REVERSED` (still counted in every report, not excluded - see the
    comment in `reports.service.ts`).
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

### Phase 2 - Accounting Automation

Maps to SRS §98 Phase 2. Every posting operation below goes through the
same `JournalsService` invariant as Phase 1 - none of this code writes a
`JournalLine` directly.

- **Fixed Assets** (SRS §21): asset register; acquisition posts
  immediately (Debit asset, Credit funding account); a depreciation run
  (`POST /clients/:clientId/depreciation-runs`) computes straight-line
  depreciation for every ACTIVE asset and posts one journal for the whole
  run, capped so an asset is never depreciated below its salvage value;
  `@@unique([clientId, periodLabel])` makes double-running a period
  impossible at the DB level; disposal posts the netbook-value write-off
  and any gain/loss in one balanced journal.
- **Inventory** (SRS §20): products/warehouses, weighted-average costing.
  Receipts recompute the running average cost; issues consume at that
  average and are rejected if they'd take quantity on hand negative;
  adjustments handle found/written-off stock either direction. Every
  movement posts its own journal (Inventory vs. funding/COGS/adjustment
  account) in the same transaction that updates `ProductStock`, so the
  subledger and the GL control account can't drift apart. A valuation
  report sums quantity × average cost per product/warehouse.
- **Expense Management** (SRS §23): expense claims with a segregation-of-
  duties workflow (SRS §55) - DRAFT → SUBMITTED (`MANAGE_EXPENSES`) →
  APPROVED/REJECTED (`APPROVE_EXPENSES`, a different permission) →
  POSTED, which reimburses via a bank/cash account chosen at posting time
  and debits each line's own category account (not a generic "expense
  claim" label - the actual line description carries through to the
  journal, since that's what the classification suggester in this phase
  reads).
- **Payroll** (SRS §22): a payroll run snapshots each employee's pay onto
  a `Payslip` at creation time (so a later base-salary change never
  rewrites a past run's history) and posts one journal per run - Debit
  Salaries & Wages for total gross, Credit Salaries Payable for total
  net, Credit a deductions-payable account for whatever was withheld.
  Jurisdiction-specific withholdings (GOSI, WHT, ...) get real dedicated
  accounts once Phase 3's regulatory rules engine lands.
- **Bank Reconciliation** (SRS §§16, 42): CSV statement import (hand-
  rolled quote-aware parser, no dependency - `apps/api/src/banking/csv.ts`);
  an auto-match pass pairs each unmatched statement line to an
  unreconciled GL line on that bank account by signed amount and a
  configurable date window; manual match/unmatch for anything the
  heuristic can't pair, with amount validation; "create transaction from
  line" for real bank activity that was never recorded (fees, interest)
  - posts a new journal and matches it in the same step; reconciliation
  sessions snapshot a statement's ending balance and compute book-vs-
  statement variance, and can only be marked complete once every
  statement line up to that date is matched. Matching only ever flips a
  `reconciled` flag and a `matchedJournalLineId` pointer - never edits or
  deletes a posted journal (SRS §65).
- **Document Intelligence v1** (SRS §40) - an honest v1, not a stand-in for
  the real thing: regex field extraction (amount/date/invoice number/tax
  number) from text-based PDFs (`pdf-parse`) and plain text/CSV.
  Image-based (scanned) documents fail extraction explicitly with a clear
  reason rather than silently returning nothing - there's no OCR engine
  (e.g. Tesseract) wired into this environment. Confidence is capped at
  95% and scales with how many fields were actually found.
- **AI Classification v1** (SRS §§37, 39) - also an honest v1: a
  Jaccard-similarity + frequency heuristic over the client's own posting
  history (`ClassificationService`), not a trained model or an LLM call -
  there's no ML runtime or LLM API wired into the app process. It
  produces the same *shape* of output SRS §39 asks for - confidence,
  evidence, risk, a recommended action (`AUTO_POST_PERMITTED` only above
  a high-confidence, multi-precedent threshold; `ESCALATE_TO_REVIEW`
  otherwise) - so a future model-backed agent is a strict upgrade behind
  the same interface, not a rewrite.
- **Frontend**: tabs for Banking, Fixed Assets, Inventory, Employees,
  Expenses, and Payroll alongside the Phase 1 workspace, covering the
  primary action in each module (acquire/depreciate/dispose an asset,
  receive/issue stock, run the expense-claim workflow, create/post a
  payroll run, import a statement and match/reconcile it).

### Phase 3 - Saudi Compliance

Maps to SRS §98 Phase 3. Two v1s in here (e-invoicing, and the rate content
itself) are explicitly scoped down to what's honestly buildable without a
government-issued certificate or a tax opinion - see each item below and
the confirmation logged for this phase in the session that built it.

- **Regulatory Rules Engine** (SRS §58): `RegulatoryRule` rows keyed by
  (jurisdiction, authority, ruleType, code) with `effectiveFrom`/
  `effectiveTo`, resolved by `RegulatoryRulesService.resolve(...)` - the
  one place every VAT/WHT/Zakat calculation gets its rate from, never a
  hard-coded percentage. Global, not client-scoped (a jurisdiction's VAT
  rate is a fact about the jurisdiction, not about any one firm's client;
  in a real deployment this would likely be platform-admin-managed).
  Creating a new open-ended rule automatically closes off the previous one
  the day before, so two versions never overlap ambiguously. Seeded with
  real KSA history as a demonstration this isn't just a single current
  value: VAT standard rate 5% (2018-01-01) → 15% (2020-07-01), Zakat 2.5%,
  and a handful of WHT category rates (flagged in the seed as
  approximate - verify against current ZATCA guidance before relying on
  them).
- **Tax Periods** (SRS §§25-28): a `TaxPeriod` (VAT/WHT/ZAKAT) is the
  shared filing-window concept behind all three return types; creating
  one auto-generates its Compliance Calendar deadline in the same call,
  using a configurable default offset from period end (VAT +30d, WHT
  +10d, Zakat +120d - approximations, overridable per period).
- **VAT Returns** (SRS §§25-26): computed live from posted journal
  activity on the VAT_OUTPUT/VAT_INPUT control accounts within the
  period's date range - never a running total that could drift. Filing
  nets that period's output/input VAT into a single payable-or-receivable
  account chosen at filing time, with a balanced settlement journal
  either way the position nets (proven both ways in
  `apps/api/test/phase3.spec.ts`).
- **Withholding Tax** (SRS §28): a supplier carries an optional
  `whtCategoryCode`; `POST /clients/:clientId/wht/calculate` previews the
  withholding via the rules engine (using the *client's own* jurisdiction,
  not a hard-coded one) before a payment is made. A `PAYMENT`-type
  Payment can carry `whtAmount` - the bill is still settled at its full
  (gross) amount, but the bank movement is reduced by `whtAmount` and the
  difference credited to a WHT payable account in the same balanced
  journal. A WHT return aggregates a period's withheld amounts by
  category for filing/record-keeping; remitting the accumulated payable
  balance is an ordinary manual journal entry via the existing Journals
  module, not a separate posting action.
- **Zakat Engine** (SRS §27) - the commonly-published "net worth" method
  as a configurable starting point, explicitly **not vetted tax advice**:
  `zakatBase = equity + additions - netFixedAssets - deductions`,
  `zakatDue = max(zakatBase, 0) × zakatRate`. `equity` (sum of EQUITY-type
  account balances) and `netFixedAssets` (sum of ACTIVE assets' cost minus
  accumulated depreciation) are computed live from the ledger/asset
  register; everything else a real computation needs - financing
  classification of long-term liabilities, investments in other entities,
  etc. - is entered as an explicit `ZakatAdjustment` line, so the return
  is auditable line-by-line rather than a black-box number. Filing posts
  a balanced Debit-expense/Credit-payable journal only when `zakatDue` is
  positive.
- **ZATCA-shaped e-invoicing v1** (SRS §26) - local generation only, and
  explicitly not a Fatoora integration: this environment has no
  government-issued cryptographic certificate to sign anything with, so
  it stops at what's publicly documented and doesn't require one. For a
  POSTED invoice, `EInvoiceService` builds the five-field TLV QR payload
  every KSA simplified tax invoice carries (seller name, VAT number,
  timestamp, invoice total, VAT total - base64-encoded, rendered as a
  real scannable PNG via `qrcode`) and an illustrative UBL-2.1-shaped XML.
  Neither is schema-certified, cryptographically stamped, or submitted to
  a live system - see the comments in `apps/api/src/einvoice/`.
- **Compliance Calendar** (SRS §47): deadlines bucketed into
  OVERDUE/DUE_TODAY/DUE_THIS_WEEK/DUE_THIS_MONTH/UPCOMING/COMPLETED,
  computed on read (never stored) so "overdue" is always accurate as of
  the moment it's viewed. Auto-populated from tax periods; also supports
  manual custom deadlines for anything else (CR renewal, GOSI, municipal
  license, ...).
- **Segregation of duties** (SRS §55) extends to tax: `MANAGE_TAX`
  (prepare periods/returns, assign WHT categories) is distinct from
  `FILE_TAX_RETURNS` (file/post VAT and Zakat returns) - the same
  preparer-≠-approver split already used for expense claims.
- **Frontend**: Compliance, VAT, WHT, and Zakat tabs alongside the
  existing workspace, plus an "E-invoice" action on posted invoices that
  displays the QR code and XML inline.

### Phase 4 - Professional CA

Maps to SRS §98 Phase 4. The theme here isn't a new subsystem-scale v1 the
way Phase 2/3 had (OCR, ZATCA) - it's *identity-level* segregation of duties
(SRS §55): three workflows below don't just gate an action behind a
permission, they reject an actor who is the same person that performed the
prior step, regardless of what permissions that person holds. All three
follow the same shape - `ForbiddenException` thrown directly in the service,
not something a permission bundle can route around.

- **Engagements** (SRS §33): `Engagement` gained acceptance
  (PENDING/ACCEPTED/DECLINED), materiality (`materialityAmount` +
  `materialityBasis`), scope, a team roster (`EngagementTeamMember`,
  PARTNER/MANAGER/SENIOR/STAFF), a completion checklist, and a
  conclude → approve close-out. `EngagementsService.conclude()` refuses to
  run while any completion item is still `PENDING` (`COMPLETE` or
  `NOT_APPLICABLE` both count as resolved); `approve()` refuses when
  `approvedById` would equal `concludedById` - the conclusion has to be
  signed off by someone other than whoever wrote it.
- **Independence Engine** (SRS §36): `IndependenceCheck` logs eight
  standard threat categories (financial interest, close relationship, prior
  engagement conflict, prohibited activity, self-review, familiarity,
  advocacy, management participation) as booleans; any flag set to `true`
  computes `status = EXCEPTION` (else `CLEARED`) and is mirrored onto
  `Engagement.independenceStatus` so it's visible without opening the
  check itself. An exception can't be resolved by the same user who logged
  it (`IndependenceService.resolve()` throws `ForbiddenException`
  otherwise) - resolution is `SAFEGUARDED` or `DECLINED_ENGAGEMENT`, both
  requiring notes.
- **Audit module** (SRS §§33-34): a risk register (`AuditRisk` - category
  INHERENT/CONTROL/DETECTION/FRAUD, likelihood × impact, an assertion from
  SRS §34's list, optional significant-risk flag) feeds audit procedures
  (`AuditProcedure` - CONTROL_TEST/SUBSTANTIVE_TEST/ANALYTICAL_PROCEDURE,
  optionally linked to a risk, sample size, NOT_STARTED → IN_PROGRESS →
  COMPLETED with `performedById`/`performedAt` stamped on the first status
  change), which produce evidence (`AuditEvidence` - linkable to a
  procedure, a finding, and/or an uploaded `Document`) and findings
  (`AuditFinding` - EXCEPTION/MISSTATEMENT/CONTROL_DEFICIENCY, an amount,
  severity, OPEN → RESOLVED/ACCEPTED with a management response). Named
  `audit-work` in the codebase (not `audit`) to stay distinct from the
  pre-existing Phase 1 audit *trail* module (`AuditLog`) - two genuinely
  different meanings of "audit" that share a name in the SRS.
- **Professional Judgment Engine** (SRS §35): `ProfessionalJudgmentCase`
  models Question → Facts → Applicable standards → Possible treatments
  → Decision → Approval, optionally tied to an engagement. Deliberately
  does **not** auto-generate the "AI analysis"/recommendation text the SRS
  describes - there's no LLM wired into this app process, and a
  plausible-sounding fabricated recommendation on an accounting judgment
  call would be actively misleading (unlike Phase 2's classification
  heuristic, which is explicit about being a heuristic).
  `possibleTreatments`, `decision`, and `recommendation` are filled in by
  the professional. `decidedById` and `approvedById` are enforced distinct
  the same way as engagement conclusion.
- **New role**: `AUDITOR` (SRS §3.4) - `VIEW_CLIENT`, `MANAGE_ENGAGEMENTS`,
  `MANAGE_INDEPENDENCE`, `MANAGE_AUDIT`, `MANAGE_PROFESSIONAL_JUDGMENT`,
  plus reporting/document access - deliberately excludes `APPROVE_AUDIT`
  and `APPROVE_PROFESSIONAL_JUDGMENT` so the identity check above isn't the
  only thing standing between an auditor and self-approval; `PARTNER`
  holds every Phase 4 permission including both approve codes.
- **Frontend**: an Engagements tab (list + create, and a detail view
  covering acceptance, team, independence checks, risk register,
  procedures, evidence, findings, completion checklist, and
  conclude/approve) and a Judgment tab (create/decide/approve), each
  showing a plain-language note (not just a disabled button) when the
  signed-in user is the one who would be blocked from approving their own
  work.

### Deliberate simplifications

These are scoped out on purpose, not overlooked - each is a natural
extension point for a later pass:

- Journal numbering is `count(journals for client) + 1` inside the posting
  transaction - correct under normal single-writer usage, but not
  collision-proof under heavy concurrent writers (would need a DB
  sequence per client).
- Payments require full allocation (`sum(allocations) === amount`) - no
  on-account/unapplied cash yet.
- One base chart-of-accounts template for every new client (SRS §60's
  business-category templates and jurisdiction packs are not yet layered
  in).
- Expense claim reimbursement is immediate on posting - no employee
  payable subledger/aging the way AP has one.
- Payroll deductions are a single lumped liability line - no per-type
  breakdown (GOSI, WHT, ...) until Phase 3's regulatory rules engine.
- Bank statement import expects a `date`/`description`/`amount` (or
  `debit`+`credit`) CSV - no OFX/QIF/bank-API feeds yet.
- Document Intelligence: text-based PDFs and plain text only, no image
  OCR. AI Classification: a same-client posting-history heuristic, no
  cross-client learning and no LLM in the loop.
- Regulatory rules are editable by any user holding
  `MANAGE_REGULATORY_RULES` (FIRM_OWNER/PARTNER by default) - in a real
  multi-tenant deployment, jurisdiction facts like a country's VAT rate
  would more likely be platform-admin-managed, not per-firm-editable.
- WHT categories/rates and the Zakat net-worth formula follow commonly
  published guidance as a configurable starting point - not vetted tax
  advice, and not a substitute for a qualified reviewer before filing.
- E-invoicing stops at local TLV/QR + illustrative XML generation - no
  ZATCA API integration, no cryptographic invoice signing (no certificate
  available in this environment), no live clearance/reporting.
- Engagement team members are added by user ID (a firm user picker isn't
  wired into that form - `GET /users` requires `MANAGE_USERS`, which the
  `AUDITOR` role deliberately doesn't hold, so it can't double as a lookup
  for every role that can add a team member).
  The completion checklist is one fixed standard list
  (`STANDARD_COMPLETION_CHECKLIST`) seeded per engagement, not yet
  templated per service type or jurisdiction.
- Audit procedures/evidence/findings have no sampling methodology or
  statistical projection - `sampleSize` is just an integer the preparer
  records, not computed.
- No workpaper document generation (engagement letters, management
  representation letters, audit reports) - `Document` upload/linkage
  exists, but nothing in this phase drafts those documents.
- No AI agents yet (see Roadmap - SRS §37's 20 agents are Phase 5) -
  Phase 4's professional judgment engine is deliberately the human-filled
  version described above.

## Repository layout

```
apps/
  api/              NestJS backend
    src/
      auth/             JWT auth, register-firm, login
      rbac/              permissions, guards (PermissionsGuard, ClientTenantGuard)
      clients/           client onboarding + CRUD
      customers/         AR master data
      suppliers/         AP master data
      accounting/
        coa/             chart of accounts
        fiscal/          fiscal years & accounting periods
        journals/        the ledger posting engine
      sales/             invoices (posts to GL)
      purchases/         bills (posts to GL)
      payments/          receipts & payments (posts to GL, allocates to docs)
      reports/           trial balance, GL ledger, AR/AP aging
      documents/         upload/download + metadata
      audit/             audit log service + read endpoint
      employees/         HR master data (shared by expenses & payroll)
      fixed-assets/      asset register, depreciation runs, disposal
      inventory/         products, warehouses, stock movements (weighted avg)
      expenses/          expense claim workflow + posting
      payroll/           payroll runs + posting
      banking/           statement import, matching, reconciliation sessions
      intelligence/      document field extraction + classification suggestions
      regulatory-rules/  versioned jurisdiction rules (VAT/WHT/Zakat rates)
      tax-periods/       shared VAT/WHT/Zakat filing-window concept
      vat/               VAT return generate/file
      wht/               WHT calculation preview + return generate/file
      zakat/             Zakat base computation, adjustments, return filing
      einvoice/          ZATCA-shaped QR (TLV) + illustrative XML generation
      compliance/        deadline calendar (bucketed dashboard)
      engagements/       acceptance, materiality, team, completion, conclude/approve
      independence/      independence threat checks + resolution
      audit-work/        risk register, procedures, evidence, findings (audit *work*,
                          distinct from audit/ = the audit *trail*/AuditLog module)
      judgment/          professional judgment cases (decide/approve)
    test/             vitest integration tests against a real Postgres DB
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

Running the integration test suite (uses `apps/api/.env.test` - point it at
a separate database, e.g. `accountant_os_test`, and run migrations against
it once):

```bash
DATABASE_URL=<test-db-url> pnpm --filter @accountant-os/db exec prisma migrate deploy
pnpm --filter @accountant-os/api test
```

## Roadmap (SRS §98 Phases 5-6)

Not built yet - listed here so scope is explicit rather than implied:

- **Phase 5 - AI workforce**: the 20 agents in SRS §37 - a real step up
  from this repo's rule-based v1s - all operating under the
  OBSERVE→...→RECORD EVIDENCE model (SRS §38) with the confidence/
  escalation contract in SRS §39 and the guardrails in SRS §67, including
  the hard rule that AI never has final authority over a posting or
  professional conclusion (SRS §4).
- **Phase 6 - Universal Business Compiler**: jurisdiction/industry
  template packs (SRS §§59-60) that generate chart of accounts, forms,
  workflows, and dashboards from a client's country/category/framework
  instead of one fixed template.

Also not yet built, needed before any production deployment: the client
portal's own UI (client-facing views reusing the RBAC/tenancy already in
place), mobile apps (SRS §84), notification delivery (SRS §78, currently
just logged), MFA (SRS §53), and object storage for documents in place of
local disk.

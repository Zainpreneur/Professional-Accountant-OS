# Professional Accountant OS

A digital operating system for a professional accounting / CA practice: multi-tenant, API-first,
AI-native, and rules-driven, covering the full client lifecycle from onboarding through
accounting, tax/VAT/Zakat compliance, audit, and professional reporting.

Jurisdiction-configurable, with Saudi Arabia (ZATCA e-invoicing, VAT, Zakat) as a first-class
configuration.

This repository implements all six of SRS §98's MVP-to-full-platform phases — **Phase 1
(Professional Foundation)**, **Phase 2 (Accounting Automation)**, **Phase 3 (Saudi Compliance)**,
**Phase 4 (Professional CA)**, **Phase 5 (AI Workforce)**, and **Phase 6 (Universal Business
Compiler)** — as real, running, tested code: multi-tenancy, RBAC, client onboarding, a
double-entry accounting core, AR/AP, payments, fixed assets, inventory, expense claims, payroll,
bank reconciliation, document field extraction, rule-based posting suggestions, a versioned
regulatory rules engine, VAT/WHT/Zakat returns, ZATCA-shaped e-invoicing (local QR + XML
generation, not a live Fatoora integration), a compliance calendar, engagements (acceptance,
materiality, team, completion, conclude/approve), an independence engine, an audit module (risk
register, procedures, evidence, findings), a professional judgment engine — with identity-based
segregation of duties (an approver can never be the same person as the preparer) enforced across
all three closing workflows — an 8-agent AI workforce (SRS §37's MVP subset) that scans real
client data and surfaces findings to a color-coded Professional Review Queue, never posting or
filing anything on its own, and a Business Compiler that composes each new client's chart of
accounts from its business category and jurisdiction (6 industry templates × 3 jurisdiction tax
packs) instead of one fixed template for everyone. Each phase is a deliberately MVP-scoped slice,
not the entire SRS module it maps to — see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for
exactly what's built vs. what's still simplified or not built at all.

## Documentation

- [Full Consolidated Software Requirements Specification (SRS)](docs/SRS.md) — the authoritative
  requirements document covering actors, architecture, the full module catalogue (accounting,
  tax, audit, AI workforce, reporting, security, etc.), the Business Compiler concept, and the
  phased MVP-to-full-platform roadmap.
- [Architecture & implementation status](docs/ARCHITECTURE.md) — stack, what's implemented,
  what's deliberately deferred, repository layout, and how to run it locally.

## Quick start

```bash
pnpm install
cp .env.example .env                 # adjust DATABASE_URL if needed
docker compose up -d                 # or point DATABASE_URL at any Postgres 16 you have running

pnpm --filter @accountant-os/db exec prisma migrate deploy
pnpm db:seed                         # demo firm + client
#   login: owner@demo-firm.test / Password123!

pnpm dev:api                         # http://localhost:4000/api/v1
pnpm dev:web                         # http://localhost:3000
```

## Repository layout

```
apps/api/     NestJS backend (auth, RBAC, accounting core, AR/AP, payments, reports, documents,
              fixed assets, inventory, payroll, banking, VAT/WHT/Zakat, e-invoicing, compliance)
apps/web/     Next.js firm workspace
packages/db/  Prisma schema, migrations, seed script
docs/         SRS + architecture docs
```

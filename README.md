# Professional Accountant OS

A digital operating system for a professional accounting / CA practice: multi-tenant, API-first,
AI-native, and rules-driven, covering the full client lifecycle from onboarding through
accounting, tax/VAT/Zakat compliance, audit, and professional reporting.

Jurisdiction-configurable, with Saudi Arabia (ZATCA e-invoicing, VAT, Zakat) as a first-class
configuration.

This repository currently implements **Phase 1 (Professional Foundation)**: multi-tenancy, RBAC,
client onboarding, a double-entry accounting core, AR/AP, payments, reporting, documents, and an
audit trail — as real, running, tested code. See
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for exactly what's built vs. the full roadmap.

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
apps/api/     NestJS backend (auth, RBAC, accounting core, AR/AP, payments, reports, documents)
apps/web/     Next.js firm workspace
packages/db/  Prisma schema, migrations, seed script
docs/         SRS + architecture docs
```

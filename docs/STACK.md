# Stack Details & Modernisation Plan

Status: **living document** · Last updated: 2026-10-22

This file records what the project runs on today, what we intend to keep, replace, or add, and the order in which we will do it. Update the decision log whenever a choice is made so future work has a single source of truth.

---

## 1. Current stack

### Runtime and tooling

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Language | TypeScript | 5.6 | Strict-ish config; API and web are separate packages |
| Package manager | pnpm workspaces | 10.33 | Root scripts orchestrate API, web, and database packages |
| Monorepo | pnpm workspaces | — | `apps/api`, `apps/web`, `packages/db` |
| API runtime | Node.js | >= 20 | NestJS 10 application |
| Web build | Vite | 5.4 | SPA, port `3000`, `@` alias to `src` |
| API server | NestJS | 10.4 | Global prefix `/api/v1`, port `4000` |
| API dev runner | nodemon + ts-node | — | `node -r ts-node/register/transpile-only` |
| API tests | Vitest | 2.1 | Integration tests under `apps/api/test` |

### Backend

| Concern | Technology | Notes |
|---|---|---|
| Framework | NestJS 10 | Modules, DI, guards, pipes |
| ORM | Prisma | 5.20 |
| Database | SQLite | Local file database; replaced by Postgres before production |
| Auth | JWT via `@nestjs/jwt` + Passport | Token stored in browser `localStorage` |
| Password hashing | bcryptjs | Pure-JS bcrypt |
| Validation | class-validator + class-transformer | Global `ValidationPipe` with whitelist and transform |
| Uploads | Multer | Local filesystem storage |
| PDF text extraction | pdf-parse | Used by document intelligence |
| QR generation | qrcode | ZATCA-shaped QR output |
| API docs | None | No Swagger/OpenAPI document is generated |
| Security middleware | None | CORS is currently `cors: true`; no Helmet or rate limiting |
| Background jobs | None | AI scans and other long work run inline |
| Caching | None | Reports are calculated live from ledger rows |
| Logging | console | No structured logger or request IDs |

### Frontend

| Concern | Technology | Notes |
|---|---|---|
| UI | React | 18.3 |
| Routing | React Router | 6.28 |
| Styling | Tailwind CSS | 3.4 + PostCSS + autoprefixer |
| Icons | lucide-react | 0.468 |
| Data fetching | Hand-rolled `fetch` wrapper | `useEffect` + `useState` per page |
| Forms | Hand-rolled state | No form library or shared schema |
| Dialogs/tables | Hand-rolled | One shared modal; plain HTML tables |
| Notifications | None | No toast system |
| Tests | None | No component, unit, or E2E tests |
| Lint/format | `tsc --noEmit` only | No ESLint or Prettier |
| Bundling | Single bundle | Production output is roughly 360 kB JS / 43 kB CSS |

### Data and money

- Money and quantities already use Prisma `Decimal`, not `Float`. Preserve this.
- Journal lines are written through the accounting service, not directly.
- Reports are derived from ledger rows rather than cached totals.
- SQLite has no native `numeric`, row-level locking, or strong concurrency guarantees.

---

## 2. Current risks

1. **SQLite in production** — concurrent writes, decimal fidelity, and operational backups are not suitable for a multi-tenant accounting product.
2. **JWT in `localStorage`** — any XSS becomes full account takeover. No refresh rotation or session revocation exists.
3. **No API contract** — the web app duplicates request/response interfaces by hand, so drift is likely.
4. **No end-to-end tests** — the 21 client modules are only verified manually or through ad-hoc scripts.
5. **No rate limiting or security headers** — the API is open to brute-force and common browser attacks.
6. **Synchronous AI/import work** — long tasks block HTTP requests and cannot be retried safely.
7. **No structured observability** — production incidents would be diagnosed from console logs.
8. **No idempotency or optimistic locking** — retries can double-post financial documents.

---

## 3. Target stack

### Keep

| Technology | Reason |
|---|---|
| NestJS | Module/DI structure fits the domain and permission model. No rewrite needed. |
| Prisma | Productive and type-safe. The migration to Postgres is more valuable than switching ORMs. |
| React + Vite | Correct choice for an authenticated SPA. No SSR/SEO requirement. |
| React Router | Sufficient for the current route tree. |
| Tailwind CSS | The design system is built on it; keep it. |
| Vitest | Keep the existing API integration tests. |
| SQLite | Keep as an optional local/demo/test mode after Postgres becomes primary. |

### Replace

| Current | Replacement | Reason | Effort | Priority |
|---|---|---|---|---|
| SQLite | PostgreSQL | Concurrency, `numeric`, JSONB, constraints, indexing, backups | M | P0 |
| JWT in `localStorage` | Short-lived access token + httpOnly refresh cookie with rotation | XSS resistance, revocation, session control | M–L | P0 |
| `cors: true` | Explicit CORS allowlist + Helmet + Throttler | Production security baseline | S | P0 |
| Hand-rolled `fetch` + `useEffect` | TanStack Query + generated OpenAPI client | Caching, invalidation, retries, less boilerplate | M | P1 |
| Hand-rolled forms | React Hook Form + Zod | Validation, field state, fewer bugs | M | P1 |
| Manual request/response interfaces | OpenAPI + Orval/openapi-typescript | One contract shared by API and web | M | P1 |
| bcryptjs | Argon2id | Stronger password hashing; rehash on login | S | P1 |
| nodemon + ts-node | `tsx watch` or Nest SWC | Faster, simpler dev loop | S | P3 |
| Plain HTML tables | TanStack Table + TanStack Virtual | Sorting, filtering, pagination, virtualised ledgers | M | P3 |
| Hand-rolled modal | Radix UI primitives (or shadcn/ui) | Focus trap, ARIA, keyboard behaviour | M | P3 |

### Add

| Area | Technology | Reason | Effort | Priority |
|---|---|---|---|---|
| E2E tests | Playwright | Critical accounting flows must be regression-tested | M | P0 |
| Component tests | Testing Library + Vitest | Shared UI behaviour and accessibility | S–M | P2 |
| Lint/format | ESLint + Prettier, or Biome | Consistent code and CI gates | S | P0 |
| CI | GitHub Actions | Typecheck, lint, tests, E2E, build on every PR | S–M | P0 |
| API docs | `@nestjs/swagger` | Discoverable contract and client generation | S | P1 |
| Background jobs | BullMQ + Redis (`@nestjs/bullmq`) | AI scans, imports, reports, reminders | M | P2 |
| Object storage | S3-compatible (S3, R2, MinIO) | Replace local uploads; signed URLs | S–M | P2 |
| Observability | Pino/nestjs-pino + Sentry + request IDs | Structured logs and crash reporting | S | P2 |
| Env validation | Zod/Joi with `@nestjs/config` | Fail fast on bad configuration | S | P1 |
| Toasts | Sonner | User feedback for async actions | S | P3 |
| Charts | Recharts or Tremor | Financial trends and aging visuals | S–M | P3 |
| Timezones | date-fns + date-fns-tz | Firm timezone for period boundaries | S | P2 |
| i18n/RTL | i18next + react-i18next | Arabic UI and RTL support | L | P4 |
| Local infrastructure | Docker Compose (Postgres, Redis, MinIO) | Reproducible development | S | P2 |
| Deployment | Static web on CDN; API on Fly.io/Render/Railway/AWS; Caddy/Nginx | Same-origin auth and simple operations | M | P2 |
| MFA | TOTP (`otplib`) or WebAuthn | Stronger authentication for firm admins | M | P2 |
| Idempotency | `Idempotency-Key` table on posting endpoints | Safe retries without double posting | M | P1 |
| Concurrency | `version` columns on financial documents | Prevent lost updates | M | P1 |
| Route splitting | `React.lazy` + Suspense | Keep the SPA bundle small as modules grow | S | P3 |

### Defer or avoid

| Technology | Decision |
|---|---|
| Next.js | Not needed for an authenticated SPA. Revisit only if public marketing/SEO pages are added. |
| GraphQL / tRPC | REST + OpenAPI is sufficient and simpler to operate. |
| Drizzle ORM | Not worth a rewrite; Prisma is working. |
| Redux | TanStack Query + local state cover the needs. |
| Microservices / Kubernetes | Premature. One API and one database are easier to run and reason about. |
| Caching layer for reports | Add Redis only after measuring a real bottleneck. Correctness first. |
| Tailwind 4 / React 19 / Vite 7 / NestJS 11 | Schedule framework upgrades after CI and tests are in place. |

---

## 4. Delivery plan

### Phase 0 — Safety net (before refactoring)

- [ ] Add ESLint + Prettier (or Biome) and make `pnpm lint` run them.
- [ ] Add GitHub Actions: install, typecheck API/web, run Vitest, build web.
- [ ] Add Playwright with seeded database and critical-path tests:
  - login/logout
  - create client
  - post a balanced journal
  - post and pay an invoice
  - generate a VAT return
- [ ] Document local setup in README.

**Exit criteria:** every PR runs lint, typecheck, API tests, E2E tests, and a production build.

### Phase 1 — Contracts and frontend architecture

- [ ] Add `@nestjs/swagger`; expose `/api/docs` outside production.
- [ ] Generate web types/hooks with Orval or openapi-typescript.
- [ ] Introduce TanStack Query and migrate the 21 client pages incrementally.
- [ ] Add React Hook Form + Zod to new/updated forms first.
- [ ] Add `@nestjs/config` with schema validation.
- [ ] Add idempotency keys and version columns to posting endpoints.

**Exit criteria:** no page manually manages fetch loading/error state; API types are generated; critical writes are retry-safe.

### Phase 2 — Production data and security

- [ ] Provision PostgreSQL and switch Prisma provider.
- [ ] Create a Postgres baseline migration and a data-copy script for SQLite.
- [ ] Replace localStorage JWT with access + httpOnly refresh cookie rotation.
- [ ] Add Helmet, throttling, explicit CORS allowlist, and secure cookie settings.
- [ ] Add MFA for firm admins.
- [ ] Add Pino request logging and Sentry on API + web.
- [ ] Add Docker Compose for Postgres/Redis/MinIO.
- [ ] Define backup and restore procedure with tested RPO/RTO.

**Exit criteria:** staging runs on Postgres, auth survives XSS review, and restore has been rehearsed.

### Phase 3 — Async work and scale

- [ ] Add Redis + BullMQ for AI scans, document extraction, imports, and reminders.
- [ ] Move uploads to S3-compatible storage with signed URLs and virus scanning.
- [ ] Add TanStack Table/Virtual to the largest ledgers.
- [ ] Add React.lazy route splitting.
- [ ] Add charts and toasts where they improve decisions.
- [ ] Add firm timezone handling for period boundaries.

**Exit criteria:** long-running work is queued and retryable; ledger screens stay responsive at realistic volumes.

### Phase 4 — Market readiness

- [ ] Add i18n and RTL support for Arabic.
- [ ] Evaluate real ZATCA/Fatoora integration (CSID, signing, submission).
- [ ] Evaluate bank feed and e-signature integrations.
- [ ] Add usage analytics and product telemetry with consent.

---

## 5. Accounting-specific hardening

These are not optional “nice to haves”; they protect the ledger.

1. **Database-enforced balance** — deferred constraint or trigger so unbalanced journals cannot commit.
2. **Idempotency keys** — required on journal posting, invoice posting, bill posting, and payment allocation.
3. **Optimistic concurrency** — `version` on journals, invoices, bills, and returns; reject stale writes.
4. **Immutable audit trail** — keep append-only audit records; never rely on client-side permission checks.
5. **Transactional outbox** — publish events for queues/integrations in the same transaction as the write.
6. **Timezone discipline** — store UTC, resolve period boundaries in the firm’s timezone.
7. **Decimal discipline** — never perform money math in JavaScript floats; use Prisma `Decimal` server-side and `decimal.js` only for presentation.

---

## 6. Dependency shortlist

```text
# API
@nestjs/swagger
@nestjs/config
@nestjs/throttler
@nestjs/bullmq
helmet
pino
nestjs-pino
@simplewebauthn/server
otplib
argon2
ioredis

# Web
@tanstack/react-query
@tanstack/react-table
@tanstack/react-virtual
react-hook-form
zod
@hookform/resolvers
@radix-ui/react-dialog
@radix-ui/react-dropdown-menu
@radix-ui/react-popover
@radix-ui/react-tooltip
sonner
recharts
date-fns
date-fns-tz
i18next
react-i18next

# Tooling
@playwright/test
@testing-library/react
@testing-library/user-event
eslint
prettier
# or: @biomejs/biome
orval
# or: openapi-typescript
```

---

## 7. Decision log

| ID | Decision | Status | Date | Notes |
|---|---|---|---|---|
| D-001 | Keep NestJS | Accepted | 2026-10-22 | No framework rewrite |
| D-002 | Keep Prisma | Accepted | 2026-10-22 | Migrate database, not ORM |
| D-003 | Adopt PostgreSQL for production | Proposed | 2026-10-22 | Keep SQLite for local/demo |
| D-004 | Adopt TanStack Query + OpenAPI client | Proposed | 2026-10-22 | Replace manual fetch hooks |
| D-005 | Adopt React Hook Form + Zod | Proposed | 2026-10-22 | Incremental adoption |
| D-006 | Replace localStorage JWT with httpOnly cookies | Proposed | 2026-10-22 | Requires CSRF review |
| D-007 | Add Playwright + CI before refactors | Proposed | 2026-10-22 | Safety net first |
| D-008 | Do not adopt Next.js/GraphQL/tRPC | Accepted | 2026-10-22 | Revisit only with a concrete requirement |

---

## 8. Open questions

1. Where will the production API run, and will web and API share an origin? (Affects cookie strategy.)
2. What are the backup RPO/RTO and data-residency requirements for Saudi clients?
3. Is SSO (Microsoft/Google) required for firms, or is email + MFA enough?
4. Which LLM/provider, if any, will power future AI workflows? What audit trail is required?
5. When will real ZATCA/Fatoora integration be needed?
6. What realistic data volumes must ledgers and reports handle?

---

## 9. Commands

```bash
pnpm install
pnpm dev:api     # http://localhost:4000/api/v1
pnpm dev:web     # http://localhost:3000
pnpm --filter @accountant-os/web build
pnpm --filter @accountant-os/api test
```

Demo login: `owner@demo-firm.test` / `Password123!`

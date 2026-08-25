// Canonical permission codes (SRS 54). Roles are just named bundles of these
// strings (Role.permissions in the Prisma schema), so adding a new
// permission never requires a migration - only updating this list and the
// seed data / role assignments that use it.
export const PERMISSIONS = {
  // Firm / users
  MANAGE_FIRM: "MANAGE_FIRM",
  MANAGE_USERS: "MANAGE_USERS",
  MANAGE_ROLES: "MANAGE_ROLES",

  // Clients & engagements
  VIEW_CLIENT: "VIEW_CLIENT",
  CREATE_CLIENT: "CREATE_CLIENT",
  EDIT_CLIENT: "EDIT_CLIENT",
  MANAGE_ENGAGEMENTS: "MANAGE_ENGAGEMENTS",

  // Master data
  MANAGE_MASTER_DATA: "MANAGE_MASTER_DATA", // customers, suppliers, chart of accounts

  // Transactions / GL
  CREATE_TRANSACTION: "CREATE_TRANSACTION",
  EDIT_TRANSACTION: "EDIT_TRANSACTION",
  POST_TRANSACTION: "POST_TRANSACTION",
  APPROVE_TRANSACTION: "APPROVE_TRANSACTION",
  MANAGE_PERIODS: "MANAGE_PERIODS", // open/lock/close fiscal periods

  // AR / AP
  MANAGE_SALES: "MANAGE_SALES",
  MANAGE_PURCHASES: "MANAGE_PURCHASES",
  MANAGE_PAYMENTS: "MANAGE_PAYMENTS",

  // Reporting
  VIEW_REPORTS: "VIEW_REPORTS",

  // Documents
  MANAGE_DOCUMENTS: "MANAGE_DOCUMENTS",
  VIEW_DOCUMENTS: "VIEW_DOCUMENTS",

  // Audit trail
  VIEW_AUDIT_TRAIL: "VIEW_AUDIT_TRAIL",

  // Phase 2 - Accounting automation
  MANAGE_EMPLOYEES: "MANAGE_EMPLOYEES",
  MANAGE_FIXED_ASSETS: "MANAGE_FIXED_ASSETS",
  MANAGE_INVENTORY: "MANAGE_INVENTORY",
  MANAGE_EXPENSES: "MANAGE_EXPENSES",
  APPROVE_EXPENSES: "APPROVE_EXPENSES",
  MANAGE_PAYROLL: "MANAGE_PAYROLL",
  MANAGE_BANKING: "MANAGE_BANKING",

  // Phase 3 - Saudi compliance
  MANAGE_REGULATORY_RULES: "MANAGE_REGULATORY_RULES", // in a real deployment this would be a platform-admin capability, not per-firm
  MANAGE_TAX: "MANAGE_TAX", // prepare tax periods/returns, assign WHT categories
  FILE_TAX_RETURNS: "FILE_TAX_RETURNS", // file/post VAT & Zakat returns - separate from preparation (SRS 55)
  MANAGE_COMPLIANCE: "MANAGE_COMPLIANCE", // compliance calendar

  // Phase 4 - Professional CA
  MANAGE_INDEPENDENCE: "MANAGE_INDEPENDENCE", // log/resolve independence checks (SRS 36)
  MANAGE_AUDIT: "MANAGE_AUDIT", // risk register, procedures, evidence, findings, completion checklist
  APPROVE_AUDIT: "APPROVE_AUDIT", // engagement conclusion / partner sign-off (SRS 33 Completion)
  MANAGE_PROFESSIONAL_JUDGMENT: "MANAGE_PROFESSIONAL_JUDGMENT", // create/decide judgment cases (SRS 35)
  APPROVE_PROFESSIONAL_JUDGMENT: "APPROVE_PROFESSIONAL_JUDGMENT", // approve a judgment decision - separate from deciding it

  // Phase 5 - AI workforce
  MANAGE_AI_AGENTS: "MANAGE_AI_AGENTS", // trigger an agent scan (SRS 37-38)
  REVIEW_AI_FINDINGS: "REVIEW_AI_FINDINGS", // act on the Professional Review Queue (SRS 68) - approve/reject/override a finding; no agent here ever posts on its own (SRS 4), so this is the only way a finding leads anywhere
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Default system roles seeded for every firm. Firms may add custom roles on
// top of these (Role.firmId non-null); these ship with firmId = null.
export const SYSTEM_ROLES: Record<string, { description: string; permissions: PermissionCode[] }> = {
  FIRM_OWNER: {
    description: "Firm owner / managing partner - full control (SRS 3.1)",
    permissions: Object.values(PERMISSIONS),
  },
  PARTNER: {
    description: "Licensed professional - reviews and approves (SRS 3.2)",
    permissions: [
      PERMISSIONS.VIEW_CLIENT,
      PERMISSIONS.EDIT_CLIENT,
      PERMISSIONS.MANAGE_ENGAGEMENTS,
      PERMISSIONS.MANAGE_MASTER_DATA,
      PERMISSIONS.CREATE_TRANSACTION,
      PERMISSIONS.EDIT_TRANSACTION,
      PERMISSIONS.POST_TRANSACTION,
      PERMISSIONS.APPROVE_TRANSACTION,
      PERMISSIONS.MANAGE_PERIODS,
      PERMISSIONS.MANAGE_SALES,
      PERMISSIONS.MANAGE_PURCHASES,
      PERMISSIONS.MANAGE_PAYMENTS,
      PERMISSIONS.VIEW_REPORTS,
      PERMISSIONS.MANAGE_DOCUMENTS,
      PERMISSIONS.VIEW_DOCUMENTS,
      PERMISSIONS.VIEW_AUDIT_TRAIL,
      PERMISSIONS.MANAGE_EMPLOYEES,
      PERMISSIONS.MANAGE_FIXED_ASSETS,
      PERMISSIONS.MANAGE_INVENTORY,
      PERMISSIONS.MANAGE_EXPENSES,
      PERMISSIONS.APPROVE_EXPENSES,
      PERMISSIONS.MANAGE_PAYROLL,
      PERMISSIONS.MANAGE_BANKING,
      PERMISSIONS.MANAGE_REGULATORY_RULES,
      PERMISSIONS.MANAGE_TAX,
      PERMISSIONS.FILE_TAX_RETURNS,
      PERMISSIONS.MANAGE_COMPLIANCE,
      PERMISSIONS.MANAGE_INDEPENDENCE,
      PERMISSIONS.MANAGE_AUDIT,
      PERMISSIONS.APPROVE_AUDIT,
      PERMISSIONS.MANAGE_PROFESSIONAL_JUDGMENT,
      PERMISSIONS.APPROVE_PROFESSIONAL_JUDGMENT,
      PERMISSIONS.MANAGE_AI_AGENTS,
      PERMISSIONS.REVIEW_AI_FINDINGS,
    ],
  },
  AUDITOR: {
    description: "Auditor - planning, testing, evidence, findings (SRS 3.4)",
    permissions: [
      PERMISSIONS.VIEW_CLIENT,
      PERMISSIONS.MANAGE_ENGAGEMENTS,
      PERMISSIONS.VIEW_REPORTS,
      PERMISSIONS.MANAGE_DOCUMENTS,
      PERMISSIONS.VIEW_DOCUMENTS,
      PERMISSIONS.MANAGE_INDEPENDENCE,
      PERMISSIONS.MANAGE_AUDIT,
      PERMISSIONS.MANAGE_PROFESSIONAL_JUDGMENT,
      PERMISSIONS.MANAGE_AI_AGENTS,
      PERMISSIONS.REVIEW_AI_FINDINGS,
    ],
  },
  ACCOUNTANT: {
    description: "Bookkeeping, reconciliation, reporting (SRS 3.3)",
    permissions: [
      PERMISSIONS.VIEW_CLIENT,
      PERMISSIONS.MANAGE_MASTER_DATA,
      PERMISSIONS.CREATE_TRANSACTION,
      PERMISSIONS.EDIT_TRANSACTION,
      PERMISSIONS.POST_TRANSACTION,
      PERMISSIONS.MANAGE_SALES,
      PERMISSIONS.MANAGE_PURCHASES,
      PERMISSIONS.MANAGE_PAYMENTS,
      PERMISSIONS.VIEW_REPORTS,
      PERMISSIONS.MANAGE_DOCUMENTS,
      PERMISSIONS.VIEW_DOCUMENTS,
      PERMISSIONS.MANAGE_EMPLOYEES,
      PERMISSIONS.MANAGE_FIXED_ASSETS,
      PERMISSIONS.MANAGE_INVENTORY,
      PERMISSIONS.MANAGE_EXPENSES,
      PERMISSIONS.MANAGE_PAYROLL,
      PERMISSIONS.MANAGE_BANKING,
      PERMISSIONS.MANAGE_TAX,
      PERMISSIONS.MANAGE_COMPLIANCE,
      PERMISSIONS.MANAGE_AI_AGENTS,
      PERMISSIONS.REVIEW_AI_FINDINGS,
    ],
  },
  CLIENT_ADMIN: {
    description: "Client administrator - client-portal user (SRS 3.6)",
    permissions: [
      PERMISSIONS.VIEW_CLIENT,
      PERMISSIONS.CREATE_TRANSACTION,
      PERMISSIONS.VIEW_REPORTS,
      PERMISSIONS.MANAGE_DOCUMENTS,
      PERMISSIONS.VIEW_DOCUMENTS,
    ],
  },
  CLIENT_EMPLOYEE: {
    description: "Client employee - limited data entry (SRS 3.7)",
    permissions: [PERMISSIONS.VIEW_CLIENT, PERMISSIONS.CREATE_TRANSACTION, PERMISSIONS.VIEW_DOCUMENTS],
  },
};

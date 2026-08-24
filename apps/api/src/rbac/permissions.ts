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

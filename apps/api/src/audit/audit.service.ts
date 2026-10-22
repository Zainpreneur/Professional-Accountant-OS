import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface AuditEntry {
  firmId: string;
  clientId?: string | null;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}

// Writes an immutable audit trail row (SRS 56: who/what/when/before/after).
// Callers should log at the point a state-changing action actually commits,
// ideally inside the same DB transaction as the mutation itself.
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntry, tx?: Pick<PrismaService, "auditLog">) {
    const client = tx ?? this.prisma;
    await client.auditLog.create({
      data: {
        firmId: entry.firmId,
        clientId: entry.clientId ?? null,
        userId: entry.userId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        // SQLite has no Json column type, so audit payloads are stored as JSON text.
        before: entry.before === undefined ? undefined : JSON.stringify(entry.before),
        after: entry.after === undefined ? undefined : JSON.stringify(entry.after),
      },
    });
  }
}

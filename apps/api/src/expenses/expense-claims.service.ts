import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { JournalsService } from "../accounting/journals/journals.service";
import { AuditService } from "../audit/audit.service";
import type { CreateExpenseClaimDto, PostExpenseClaimDto } from "./dto/expense-claim.dto";
import type { RequestUser } from "../common/types";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

// Expense Management (SRS 23). Workflow mirrors the segregation-of-duties
// model in SRS 55 (preparer != approver): DRAFT -> SUBMITTED (by the
// claimant/bookkeeper) -> APPROVED (a different permission, APPROVE_EXPENSES)
// -> POSTED, which is the only step that touches the ledger - Debit each
// line's category account, Credit the bank/cash account chosen at posting.
@Injectable()
export class ExpenseClaimsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly journals: JournalsService,
    private readonly audit: AuditService,
  ) {}

  list(clientId: string, status?: string) {
    return this.prisma.expenseClaim.findMany({
      where: { clientId, ...(status ? { status: status as any } : {}) },
      include: { employee: true, lines: true },
      orderBy: { date: "desc" },
    });
  }

  async get(clientId: string, claimId: string) {
    const claim = await this.prisma.expenseClaim.findUnique({
      where: { id: claimId },
      include: { employee: true, lines: { include: { categoryAccount: true } }, journal: { include: { lines: true } } },
    });
    if (!claim || claim.clientId !== clientId) throw new NotFoundException("Expense claim not found");
    return claim;
  }

  async create(actor: RequestUser, clientId: string, dto: CreateExpenseClaimDto) {
    const employee = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
    if (!employee || employee.clientId !== clientId) throw new BadRequestException("Employee not found");

    const existing = await this.prisma.expenseClaim.findUnique({
      where: { clientId_claimNumber: { clientId, claimNumber: dto.claimNumber } },
    });
    if (existing) throw new BadRequestException(`Claim number ${dto.claimNumber} already exists`);

    const totalAmount = round2(dto.lines.reduce((s, l) => s + l.amount, 0));

    const claim = await this.prisma.expenseClaim.create({
      data: {
        clientId,
        employeeId: dto.employeeId,
        claimNumber: dto.claimNumber,
        date: new Date(dto.date),
        totalAmount,
        status: "DRAFT",
        lines: {
          create: dto.lines.map((l, i) => ({
            description: l.description,
            date: new Date(l.date),
            amount: l.amount,
            categoryAccountId: l.categoryAccountId,
            lineNumber: i + 1,
          })),
        },
      },
      include: { lines: true },
    });

    await this.audit.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "EXPENSE_CLAIM_CREATED",
      entityType: "ExpenseClaim",
      entityId: claim.id,
      after: claim,
    });
    return claim;
  }

  async submit(actor: RequestUser, clientId: string, claimId: string) {
    return this.transition(actor, clientId, claimId, "DRAFT", "SUBMITTED", "EXPENSE_CLAIM_SUBMITTED");
  }

  async reject(actor: RequestUser, clientId: string, claimId: string) {
    return this.transition(actor, clientId, claimId, "SUBMITTED", "REJECTED", "EXPENSE_CLAIM_REJECTED");
  }

  async approve(actor: RequestUser, clientId: string, claimId: string) {
    return this.transition(actor, clientId, claimId, "SUBMITTED", "APPROVED", "EXPENSE_CLAIM_APPROVED");
  }

  private async transition(
    actor: RequestUser,
    clientId: string,
    claimId: string,
    from: string,
    to: string,
    action: string,
  ) {
    const claim = await this.prisma.expenseClaim.findUnique({ where: { id: claimId } });
    if (!claim || claim.clientId !== clientId) throw new NotFoundException("Expense claim not found");
    if (claim.status !== from) throw new BadRequestException(`Only a ${from} claim can move to ${to}`);

    const updated = await this.prisma.expenseClaim.update({ where: { id: claimId }, data: { status: to as any } });
    await this.audit.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action,
      entityType: "ExpenseClaim",
      entityId: claimId,
      before: { status: from },
      after: { status: to },
    });
    return updated;
  }

  async post(actor: RequestUser, clientId: string, claimId: string, dto: PostExpenseClaimDto) {
    return this.prisma.$transaction(async (tx) => {
      const claim = await tx.expenseClaim.findUnique({ where: { id: claimId }, include: { lines: true } });
      if (!claim || claim.clientId !== clientId) throw new NotFoundException("Expense claim not found");
      if (claim.status !== "APPROVED") throw new BadRequestException("Only an approved claim can be posted");

      // Aggregate by account for the journal, but keep each line's own
      // description (rather than a generic "Expense claim X") so the
      // ledger - and anything reading it, like classification suggestions
      // (SRS 39) - retains the actual evidence of what was spent on.
      const byAccount = new Map<string, { amount: number; descriptions: string[] }>();
      for (const line of claim.lines) {
        const existing = byAccount.get(line.categoryAccountId);
        if (existing) {
          existing.amount = round2(existing.amount + Number(line.amount));
          existing.descriptions.push(line.description);
        } else {
          byAccount.set(line.categoryAccountId, { amount: Number(line.amount), descriptions: [line.description] });
        }
      }

      const lines = [
        ...[...byAccount.entries()].map(([accountId, { amount, descriptions }]) => ({
          accountId,
          debit: amount,
          credit: 0,
          description: `${descriptions.join("; ")} (${claim.claimNumber})`,
        })),
        { accountId: dto.paymentAccountId, debit: 0, credit: Number(claim.totalAmount), description: `Expense claim ${claim.claimNumber}` },
      ];

      const journal = await this.journals.postSystemJournal(tx, {
        clientId,
        date: claim.date,
        description: `Expense claim ${claim.claimNumber}`,
        source: "SYSTEM",
        sourceType: "ExpenseClaim",
        sourceId: claim.id,
        lines,
        actorId: actor.id,
      });

      const posted = await tx.expenseClaim.update({
        where: { id: claimId },
        data: { status: "POSTED", journalId: journal.id, paymentAccountId: dto.paymentAccountId },
      });

      await this.audit.log(
        {
          firmId: actor.firmId,
          clientId,
          userId: actor.id,
          action: "EXPENSE_CLAIM_POSTED",
          entityType: "ExpenseClaim",
          entityId: claimId,
          after: { journalId: journal.id },
        },
        tx,
      );

      return posted;
    });
  }
}

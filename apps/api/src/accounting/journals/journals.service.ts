import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@accountant-os/db";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../../audit/audit.service";
import type { CreateJournalDto, JournalLineDto } from "./dto/create-journal.dto";
import type { RequestUser } from "../../common/types";

type Tx = Prisma.TransactionClient;

export interface SystemJournalLine {
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface SystemJournalInput {
  clientId: string;
  date: Date;
  description: string;
  source: "SALES" | "PURCHASES" | "PAYMENT" | "RECEIPT" | "SYSTEM";
  sourceType: string;
  sourceId: string;
  lines: SystemJournalLine[];
  actorId: string;
}

// The accounting engine's central invariant (SRS 11, 65): every posted
// journal must balance (total debit === total credit) and posting into a
// locked/closed period, or against an unknown/inactive account, must be
// rejected outright. Nothing else in the system is allowed to write
// JournalLine rows directly - this is the only place that happens, whether
// triggered by a manual journal entry or automatically by Sales/Purchases/
// Payments.
const EPSILON = 0.005; // half a cent, to tolerate floating point round-trip via Decimal->number

@Injectable()
export class JournalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(clientId: string, status?: string) {
    return this.prisma.journal.findMany({
      where: { clientId, ...(status ? { status: status as any } : {}) },
      include: { lines: { include: { account: true } } },
      orderBy: { date: "desc" },
    });
  }

  async get(clientId: string, journalId: string) {
    const journal = await this.prisma.journal.findUnique({
      where: { id: journalId },
      include: { lines: { include: { account: true } }, createdBy: true, postedBy: true },
    });
    if (!journal || journal.clientId !== clientId) throw new NotFoundException("Journal not found");
    return journal;
  }

  async createDraft(actor: RequestUser, clientId: string, dto: CreateJournalDto) {
    this.assertBalanced(dto.lines);
    const date = new Date(dto.date);

    return this.prisma.$transaction(async (tx) => {
      const period = await this.findOpenPeriod(tx, clientId, date);
      await this.assertAccountsUsable(tx, clientId, dto.lines);

      const journalNumber = await this.nextJournalNumber(tx, clientId);
      const journal = await tx.journal.create({
        data: {
          clientId,
          journalNumber,
          date,
          periodId: period.id,
          source: "MANUAL",
          description: dto.description,
          status: "DRAFT",
          createdById: actor.id,
          lines: {
            create: dto.lines.map((line, i) => ({
              accountId: line.accountId,
              debit: line.debit,
              credit: line.credit,
              description: line.description,
              lineNumber: i + 1,
            })),
          },
        },
        include: { lines: true },
      });

      await this.audit.log(
        {
          firmId: actor.firmId,
          clientId,
          userId: actor.id,
          action: "JOURNAL_DRAFT_CREATED",
          entityType: "Journal",
          entityId: journal.id,
          after: journal,
        },
        tx,
      );

      return journal;
    });
  }

  async post(actor: RequestUser, clientId: string, journalId: string) {
    return this.prisma.$transaction(async (tx) => {
      const journal = await tx.journal.findUnique({ where: { id: journalId }, include: { lines: true, period: true } });
      if (!journal || journal.clientId !== clientId) throw new NotFoundException("Journal not found");
      if (journal.status !== "DRAFT") throw new BadRequestException("Only a draft journal can be posted");
      if (journal.period.status !== "OPEN") {
        throw new BadRequestException(`Accounting period ${journal.period.name} is not open for posting`);
      }
      this.assertBalanced(journal.lines.map((l) => ({ debit: Number(l.debit), credit: Number(l.credit) })));

      const posted = await tx.journal.update({
        where: { id: journalId },
        data: { status: "POSTED", postedById: actor.id, postedAt: new Date() },
        include: { lines: true },
      });

      await this.audit.log(
        {
          firmId: actor.firmId,
          clientId,
          userId: actor.id,
          action: "JOURNAL_POSTED",
          entityType: "Journal",
          entityId: journalId,
          after: posted,
        },
        tx,
      );

      return posted;
    });
  }

  // Reversal instead of destructive modification (SRS 65): creates a new,
  // fully posted journal with debits/credits swapped, linked back via
  // reversalOfId. The original posted journal is left untouched.
  async reverse(actor: RequestUser, clientId: string, journalId: string, reason?: string, date?: Date) {
    return this.prisma.$transaction(async (tx) => {
      const original = await tx.journal.findUnique({ where: { id: journalId }, include: { lines: true } });
      if (!original || original.clientId !== clientId) throw new NotFoundException("Journal not found");
      if (original.status !== "POSTED") throw new BadRequestException("Only a posted journal can be reversed");

      // Defaults to today (the reversal genuinely happens now), but callers
      // - or tests - can pin it to a specific date/period when "today" has
      // no open accounting period configured yet.
      const reversalDate = date ?? new Date();
      const period = await this.findOpenPeriod(tx, clientId, reversalDate);
      const journalNumber = await this.nextJournalNumber(tx, clientId);

      const reversal = await tx.journal.create({
        data: {
          clientId,
          journalNumber,
          date: reversalDate,
          periodId: period.id,
          source: original.source,
          sourceType: original.sourceType,
          sourceId: original.sourceId,
          description: reason ? `Reversal: ${reason}` : `Reversal of ${original.journalNumber}`,
          status: "POSTED",
          createdById: actor.id,
          postedById: actor.id,
          postedAt: new Date(),
          reversalOfId: original.id,
          lines: {
            create: original.lines.map((line, i) => ({
              accountId: line.accountId,
              debit: line.credit,
              credit: line.debit,
              description: line.description,
              lineNumber: i + 1,
            })),
          },
        },
        include: { lines: true },
      });

      await tx.journal.update({ where: { id: original.id }, data: { status: "REVERSED" } });

      await this.audit.log(
        {
          firmId: actor.firmId,
          clientId,
          userId: actor.id,
          action: "JOURNAL_REVERSED",
          entityType: "Journal",
          entityId: original.id,
          after: { reversalJournalId: reversal.id },
        },
        tx,
      );

      return reversal;
    });
  }

  // Used by Sales/Purchases/Payments services to atomically post a
  // system-generated journal as part of their own transaction. Always
  // created directly as POSTED, since the originating document (an approved
  // invoice/bill/payment) is itself the authorization.
  async postSystemJournal(tx: Tx, input: SystemJournalInput) {
    this.assertBalanced(input.lines);
    const period = await this.findOpenPeriod(tx, input.clientId, input.date);
    await this.assertAccountsUsable(tx, input.clientId, input.lines);

    const journalNumber = await this.nextJournalNumber(tx, input.clientId);
    return tx.journal.create({
      data: {
        clientId: input.clientId,
        journalNumber,
        date: input.date,
        periodId: period.id,
        source: input.source,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        description: input.description,
        status: "POSTED",
        createdById: input.actorId,
        postedById: input.actorId,
        postedAt: new Date(),
        lines: {
          create: input.lines.map((line, i) => ({
            accountId: line.accountId,
            debit: line.debit,
            credit: line.credit,
            description: line.description,
            lineNumber: i + 1,
          })),
        },
      },
      include: { lines: true },
    });
  }

  private assertBalanced(lines: Array<Pick<JournalLineDto, "debit" | "credit">>) {
    if (lines.length < 2) throw new BadRequestException("A journal requires at least two lines");
    let totalDebit = 0;
    let totalCredit = 0;
    for (const line of lines) {
      if (line.debit > 0 && line.credit > 0) {
        throw new BadRequestException("A journal line cannot have both a debit and a credit");
      }
      if (line.debit === 0 && line.credit === 0) {
        throw new BadRequestException("A journal line must have a non-zero debit or credit");
      }
      totalDebit += line.debit;
      totalCredit += line.credit;
    }
    if (Math.abs(totalDebit - totalCredit) > EPSILON) {
      throw new BadRequestException(
        `Journal is not balanced: total debit ${totalDebit.toFixed(2)} != total credit ${totalCredit.toFixed(2)}`,
      );
    }
  }

  private async assertAccountsUsable(tx: Tx, clientId: string, lines: Array<{ accountId: string }>) {
    const accountIds = [...new Set(lines.map((l) => l.accountId))];
    const accounts = await tx.chartOfAccount.findMany({ where: { id: { in: accountIds } } });
    if (accounts.length !== accountIds.length) throw new BadRequestException("One or more accounts do not exist");
    for (const account of accounts) {
      if (account.clientId !== clientId) throw new BadRequestException("Account does not belong to this client");
      if (!account.active) throw new BadRequestException(`Account ${account.code} is inactive`);
    }
  }

  private async findOpenPeriod(tx: Tx, clientId: string, date: Date) {
    const period = await tx.accountingPeriod.findFirst({
      where: { clientId, startDate: { lte: date }, endDate: { gte: date } },
    });
    if (!period) throw new BadRequestException("No accounting period exists for this date");
    if (period.status !== "OPEN") throw new BadRequestException(`Accounting period ${period.name} is not open`);
    return period;
  }

  private async nextJournalNumber(tx: Tx, clientId: string): Promise<string> {
    const count = await tx.journal.count({ where: { clientId } });
    return `JNL-${String(count + 1).padStart(6, "0")}`;
  }
}

import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { JournalsService } from "../accounting/journals/journals.service";
import { AuditService } from "../audit/audit.service";
import { parseBankStatementCsv } from "./csv";
import type {
  AutoMatchDto,
  CreateReconciliationDto,
  CreateTransactionFromLineDto,
  MatchLineDto,
} from "./dto/banking.dto";
import type { RequestUser } from "../common/types";

const AMOUNT_TOLERANCE = 0.005;

// Bank Reconciliation (SRS 16, 42). Matching never edits or deletes a
// posted journal (SRS 65) - it only sets a `reconciled` flag on the
// JournalLine and a `matchedJournalLineId` on the BankStatementLine, both
// reversible via unmatch().
@Injectable()
export class BankingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly journals: JournalsService,
    private readonly audit: AuditService,
  ) {}

  private async assertBankAccount(clientId: string, bankAccountId: string) {
    const account = await this.prisma.chartOfAccount.findUnique({ where: { id: bankAccountId } });
    if (!account || account.clientId !== clientId) throw new BadRequestException("Bank account not found");
    if (account.controlAccountType !== "BANK" && account.controlAccountType !== "CASH") {
      throw new BadRequestException("Account must be a bank or cash control account");
    }
    return account;
  }

  async importStatement(
    actor: RequestUser,
    clientId: string,
    bankAccountId: string,
    file: { originalname: string; buffer: Buffer },
  ) {
    await this.assertBankAccount(clientId, bankAccountId);

    let parsed;
    try {
      parsed = parseBankStatementCsv(file.buffer.toString("utf-8"));
    } catch (err) {
      throw new BadRequestException(err instanceof Error ? err.message : "Failed to parse CSV");
    }
    if (parsed.length === 0) throw new BadRequestException("No statement lines found in file");

    const importRow = await this.prisma.bankStatementImport.create({
      data: {
        clientId,
        bankAccountId,
        fileName: file.originalname,
        importedById: actor.id,
        lines: {
          create: parsed.map((l) => ({
            date: l.date,
            description: l.description,
            amount: l.amount,
            reference: l.reference,
          })),
        },
      },
      include: { lines: true },
    });

    await this.audit.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "BANK_STATEMENT_IMPORTED",
      entityType: "BankStatementImport",
      entityId: importRow.id,
      after: { fileName: file.originalname, lineCount: parsed.length },
    });
    return importRow;
  }

  listImports(clientId: string, bankAccountId?: string) {
    return this.prisma.bankStatementImport.findMany({
      where: { clientId, ...(bankAccountId ? { bankAccountId } : {}) },
      include: { lines: true },
      orderBy: { importedAt: "desc" },
    });
  }

  async unmatched(clientId: string, bankAccountId: string) {
    await this.assertBankAccount(clientId, bankAccountId);

    const statementLines = await this.prisma.bankStatementLine.findMany({
      where: { status: "UNMATCHED", import: { clientId, bankAccountId } },
      orderBy: { date: "asc" },
    });
    const journalLines = await this.prisma.journalLine.findMany({
      where: { accountId: bankAccountId, reconciled: false, journal: { status: { in: ["POSTED", "REVERSED"] } } },
      include: { journal: true },
      orderBy: { journal: { date: "asc" } },
    });

    return { statementLines, journalLines };
  }

  // Greedy exact-amount match within a date window - each statement line is
  // paired with the closest-dated unreconciled journal line of the same
  // signed amount on that bank account. Anything left over needs a manual
  // match or a create-transaction action.
  async autoMatch(actor: RequestUser, clientId: string, dto: AutoMatchDto) {
    await this.assertBankAccount(clientId, dto.bankAccountId);
    const windowDays = dto.dateWindowDays ?? 5;
    const windowMs = windowDays * 24 * 60 * 60 * 1000;

    const statementLines = await this.prisma.bankStatementLine.findMany({
      where: { status: "UNMATCHED", import: { clientId, bankAccountId: dto.bankAccountId } },
      orderBy: { date: "asc" },
    });
    const journalLines = await this.prisma.journalLine.findMany({
      where: {
        accountId: dto.bankAccountId,
        reconciled: false,
        journal: { status: { in: ["POSTED", "REVERSED"] } },
      },
      include: { journal: true },
    });

    const usedJournalLineIds = new Set<string>();
    const matches: { statementLineId: string; journalLineId: string }[] = [];

    for (const line of statementLines) {
      const candidate = journalLines.find((jl) => {
        if (usedJournalLineIds.has(jl.id)) return false;
        const signed = Number(jl.debit) - Number(jl.credit);
        if (Math.abs(signed - Number(line.amount)) > AMOUNT_TOLERANCE) return false;
        return Math.abs(jl.journal.date.getTime() - line.date.getTime()) <= windowMs;
      });
      if (candidate) {
        usedJournalLineIds.add(candidate.id);
        matches.push({ statementLineId: line.id, journalLineId: candidate.id });
      }
    }

    if (matches.length > 0) {
      await this.prisma.$transaction(
        matches.flatMap((m) => [
          this.prisma.bankStatementLine.update({
            where: { id: m.statementLineId },
            data: { status: "MATCHED", matchedJournalLineId: m.journalLineId },
          }),
          this.prisma.journalLine.update({ where: { id: m.journalLineId }, data: { reconciled: true } }),
        ]),
      );

      await this.audit.log({
        firmId: actor.firmId,
        clientId,
        userId: actor.id,
        action: "BANK_AUTO_MATCH",
        entityType: "BankStatementImport",
        entityId: dto.bankAccountId,
        after: { matchedCount: matches.length },
      });
    }

    return { matchedCount: matches.length, remainingUnmatched: statementLines.length - matches.length };
  }

  async match(actor: RequestUser, clientId: string, dto: MatchLineDto) {
    const statementLine = await this.prisma.bankStatementLine.findUnique({
      where: { id: dto.statementLineId },
      include: { import: true },
    });
    if (!statementLine || statementLine.import.clientId !== clientId) throw new NotFoundException("Statement line not found");
    if (statementLine.status !== "UNMATCHED") throw new BadRequestException("Statement line is already matched or ignored");

    const journalLine = await this.prisma.journalLine.findUnique({
      where: { id: dto.journalLineId },
      include: { journal: true },
    });
    if (!journalLine || journalLine.journal.clientId !== clientId) throw new BadRequestException("Journal line not found");
    if (journalLine.accountId !== statementLine.import.bankAccountId) {
      throw new BadRequestException("Journal line is not on the same bank account as this statement line");
    }
    if (journalLine.reconciled) throw new BadRequestException("Journal line is already reconciled");

    const signed = Number(journalLine.debit) - Number(journalLine.credit);
    if (Math.abs(signed - Number(statementLine.amount)) > AMOUNT_TOLERANCE) {
      throw new BadRequestException("Amounts do not match");
    }

    await this.prisma.$transaction([
      this.prisma.bankStatementLine.update({
        where: { id: dto.statementLineId },
        data: { status: "MATCHED", matchedJournalLineId: dto.journalLineId },
      }),
      this.prisma.journalLine.update({ where: { id: dto.journalLineId }, data: { reconciled: true } }),
    ]);

    await this.audit.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "BANK_LINE_MATCHED",
      entityType: "BankStatementLine",
      entityId: dto.statementLineId,
      after: { journalLineId: dto.journalLineId },
    });
    return { matched: true };
  }

  async unmatch(actor: RequestUser, clientId: string, statementLineId: string) {
    const statementLine = await this.prisma.bankStatementLine.findUnique({
      where: { id: statementLineId },
      include: { import: true },
    });
    if (!statementLine || statementLine.import.clientId !== clientId) throw new NotFoundException("Statement line not found");
    if (statementLine.status !== "MATCHED" || !statementLine.matchedJournalLineId) {
      throw new BadRequestException("Statement line is not currently matched");
    }

    await this.prisma.$transaction([
      this.prisma.bankStatementLine.update({
        where: { id: statementLineId },
        data: { status: "UNMATCHED", matchedJournalLineId: null },
      }),
      this.prisma.journalLine.update({ where: { id: statementLine.matchedJournalLineId }, data: { reconciled: false } }),
    ]);

    await this.audit.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "BANK_LINE_UNMATCHED",
      entityType: "BankStatementLine",
      entityId: statementLineId,
    });
    return { matched: false };
  }

  // For bank activity with no corresponding accounting entry yet (bank
  // fees, interest, unrecorded transfers): posts a brand-new journal
  // against the statement line's amount and immediately matches it.
  async createTransactionFromLine(
    actor: RequestUser,
    clientId: string,
    statementLineId: string,
    dto: CreateTransactionFromLineDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const statementLine = await tx.bankStatementLine.findUnique({
        where: { id: statementLineId },
        include: { import: true },
      });
      if (!statementLine || statementLine.import.clientId !== clientId) throw new NotFoundException("Statement line not found");
      if (statementLine.status !== "UNMATCHED") throw new BadRequestException("Statement line is already matched or ignored");

      const amount = Number(statementLine.amount);
      const bankAccountId = statementLine.import.bankAccountId;
      const lines =
        amount >= 0
          ? [
              { accountId: bankAccountId, debit: amount, credit: 0, description: statementLine.description },
              { accountId: dto.offsetAccountId, debit: 0, credit: amount, description: statementLine.description },
            ]
          : [
              { accountId: dto.offsetAccountId, debit: -amount, credit: 0, description: statementLine.description },
              { accountId: bankAccountId, debit: 0, credit: -amount, description: statementLine.description },
            ];

      const journal = await this.journals.postSystemJournal(tx, {
        clientId,
        date: statementLine.date,
        description: dto.description,
        source: "SYSTEM",
        sourceType: "BankStatementLine",
        sourceId: statementLine.id,
        lines,
        actorId: actor.id,
      });

      const bankLine = journal.lines.find((l) => l.accountId === bankAccountId)!;

      await tx.bankStatementLine.update({
        where: { id: statementLineId },
        data: { status: "MATCHED", matchedJournalLineId: bankLine.id },
      });
      await tx.journalLine.update({ where: { id: bankLine.id }, data: { reconciled: true } });

      await this.audit.log(
        {
          firmId: actor.firmId,
          clientId,
          userId: actor.id,
          action: "BANK_LINE_TRANSACTION_CREATED",
          entityType: "BankStatementLine",
          entityId: statementLineId,
          after: { journalId: journal.id },
        },
        tx,
      );

      return journal;
    });
  }

  async createReconciliation(actor: RequestUser, clientId: string, dto: CreateReconciliationDto) {
    await this.assertBankAccount(clientId, dto.bankAccountId);
    const reconciliation = await this.prisma.bankReconciliation.create({
      data: {
        clientId,
        bankAccountId: dto.bankAccountId,
        statementDate: new Date(dto.statementDate),
        statementEndingBalance: dto.statementEndingBalance,
      },
    });

    await this.audit.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "BANK_RECONCILIATION_STARTED",
      entityType: "BankReconciliation",
      entityId: reconciliation.id,
      after: reconciliation,
    });
    return reconciliation;
  }

  listReconciliations(clientId: string, bankAccountId?: string) {
    return this.prisma.bankReconciliation.findMany({
      where: { clientId, ...(bankAccountId ? { bankAccountId } : {}) },
      orderBy: { statementDate: "desc" },
    });
  }

  async reconciliationSummary(clientId: string, reconciliationId: string) {
    const rec = await this.prisma.bankReconciliation.findUnique({ where: { id: reconciliationId } });
    if (!rec || rec.clientId !== clientId) throw new NotFoundException("Reconciliation not found");

    const sum = await this.prisma.journalLine.aggregate({
      where: {
        accountId: rec.bankAccountId,
        journal: { clientId, status: { in: ["POSTED", "REVERSED"] }, date: { lte: rec.statementDate } },
      },
      _sum: { debit: true, credit: true },
    });
    const bookBalance = Math.round((Number(sum._sum.debit ?? 0) - Number(sum._sum.credit ?? 0)) * 100) / 100;

    const unmatchedCount = await this.prisma.bankStatementLine.count({
      where: { status: "UNMATCHED", import: { clientId, bankAccountId: rec.bankAccountId }, date: { lte: rec.statementDate } },
    });

    return {
      reconciliation: rec,
      bookBalance,
      statementEndingBalance: Number(rec.statementEndingBalance),
      difference: Math.round((bookBalance - Number(rec.statementEndingBalance)) * 100) / 100,
      unmatchedCount,
    };
  }

  async completeReconciliation(actor: RequestUser, clientId: string, reconciliationId: string) {
    const summary = await this.reconciliationSummary(clientId, reconciliationId);
    if (summary.reconciliation.status === "COMPLETED") throw new BadRequestException("Reconciliation is already completed");
    if (summary.unmatchedCount > 0) {
      throw new BadRequestException(`${summary.unmatchedCount} statement line(s) are still unmatched as of the statement date`);
    }

    const updated = await this.prisma.bankReconciliation.update({
      where: { id: reconciliationId },
      data: { status: "COMPLETED", completedById: actor.id, completedAt: new Date() },
    });

    await this.audit.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "BANK_RECONCILIATION_COMPLETED",
      entityType: "BankReconciliation",
      entityId: reconciliationId,
      after: { difference: summary.difference },
    });
    return updated;
  }
}

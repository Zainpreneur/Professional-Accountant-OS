import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

// Report engine (SRS 29-30, 48-50). Phase 1 ships the reports every other
// module depends on for correctness/health checks: Trial Balance (proves
// the ledger balances), a per-account GL ledger (drill-down, SRS 86-87),
// and AR/AP aging. These read directly from posted journal lines /
// invoices / bills - never from a cached or derived table - so a report is
// always consistent with the ledger (SRS 13: "No report shall become the
// source of accounting truth").
@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async trialBalance(clientId: string, asOf?: string) {
    const asOfDate = asOf ? new Date(asOf) : new Date();

    const accounts = await this.prisma.chartOfAccount.findMany({ where: { clientId }, orderBy: { code: "asc" } });
    const sums = await this.prisma.journalLine.groupBy({
      by: ["accountId"],
      // "REVERSED" is still a posted, permanent GL entry (SRS 65: reversal,
      // not deletion) - it just means a later reversal journal offsets it.
      // Only DRAFT journals (never posted) are excluded.
      where: { journal: { clientId, status: { in: ["POSTED", "REVERSED"] }, date: { lte: asOfDate } } },
      _sum: { debit: true, credit: true },
    });
    const sumByAccount = new Map(sums.map((s) => [s.accountId, s]));

    let totalDebit = 0;
    let totalCredit = 0;
    const rows = accounts.map((account) => {
      const sum = sumByAccount.get(account.id);
      const debit = Number(sum?._sum.debit ?? 0);
      const credit = Number(sum?._sum.credit ?? 0);
      const net = round2(debit - credit);
      const balanceDebit = net > 0 ? net : 0;
      const balanceCredit = net < 0 ? -net : 0;
      totalDebit = round2(totalDebit + balanceDebit);
      totalCredit = round2(totalCredit + balanceCredit);
      return {
        accountId: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        debit: balanceDebit,
        credit: balanceCredit,
      };
    });

    return { asOf: asOfDate, rows, totalDebit, totalCredit, balanced: Math.abs(totalDebit - totalCredit) < 0.01 };
  }

  async accountLedger(clientId: string, accountId: string, from?: string, to?: string) {
    const lines = await this.prisma.journalLine.findMany({
      where: {
        accountId,
        journal: {
          clientId,
          status: { in: ["POSTED", "REVERSED"] },
          ...(from || to
            ? { date: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } }
            : {}),
        },
      },
      include: { journal: true },
      orderBy: [{ journal: { date: "asc" } }, { journal: { journalNumber: "asc" } }],
    });

    let running = 0;
    const entries = lines.map((line) => {
      running = round2(running + Number(line.debit) - Number(line.credit));
      return {
        journalId: line.journal.id,
        journalNumber: line.journal.journalNumber,
        date: line.journal.date,
        description: line.description ?? line.journal.description,
        source: line.journal.source,
        debit: Number(line.debit),
        credit: Number(line.credit),
        runningBalance: running,
      };
    });

    return { accountId, entries };
  }

  async arAging(clientId: string, asOf?: string) {
    const asOfDate = asOf ? new Date(asOf) : new Date();
    const invoices = await this.prisma.invoice.findMany({
      where: { clientId, status: { in: ["POSTED", "PARTIALLY_PAID"] } },
      include: { customer: true },
    });
    return this.buildAging(
      invoices.map((inv) => ({
        partyId: inv.customerId,
        partyName: inv.customer.name,
        documentNumber: inv.invoiceNumber,
        dueDate: inv.dueDate,
        outstanding: round2(Number(inv.total) - Number(inv.amountPaid)),
      })),
      asOfDate,
    );
  }

  async apAging(clientId: string, asOf?: string) {
    const asOfDate = asOf ? new Date(asOf) : new Date();
    const bills = await this.prisma.bill.findMany({
      where: { clientId, status: { in: ["POSTED", "PARTIALLY_PAID"] } },
      include: { supplier: true },
    });
    return this.buildAging(
      bills.map((bill) => ({
        partyId: bill.supplierId,
        partyName: bill.supplier.name,
        documentNumber: bill.billNumber,
        dueDate: bill.dueDate,
        outstanding: round2(Number(bill.total) - Number(bill.amountPaid)),
      })),
      asOfDate,
    );
  }

  private buildAging(
    documents: Array<{ partyId: string; partyName: string; documentNumber: string; dueDate: Date; outstanding: number }>,
    asOfDate: Date,
  ) {
    const buckets = documents
      .filter((d) => d.outstanding > 0.005)
      .map((d) => {
        const daysOverdue = Math.floor((asOfDate.getTime() - d.dueDate.getTime()) / (1000 * 60 * 60 * 24));
        let bucket: "current" | "1-30" | "31-60" | "61-90" | "90+";
        if (daysOverdue <= 0) bucket = "current";
        else if (daysOverdue <= 30) bucket = "1-30";
        else if (daysOverdue <= 60) bucket = "31-60";
        else if (daysOverdue <= 90) bucket = "61-90";
        else bucket = "90+";
        return { ...d, daysOverdue, bucket };
      });

    const totals = { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
    for (const b of buckets) totals[b.bucket] = round2(totals[b.bucket] + b.outstanding);

    return { asOf: asOfDate, documents: buckets, totals };
  }
}

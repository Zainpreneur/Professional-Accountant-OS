import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { JournalsService } from "../accounting/journals/journals.service";
import { AuditService } from "../audit/audit.service";
import type { CreateBillDto } from "./dto/bill.dto";
import type { RequestUser } from "../common/types";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

// Purchases / AP (SRS 15, 19). Mirror image of Sales: posting a bill debits
// each expense account for its line subtotal, debits VAT Input for the
// recoverable tax, and credits Accounts Payable for the total.
@Injectable()
export class BillsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly journals: JournalsService,
    private readonly audit: AuditService,
  ) {}

  list(clientId: string, status?: string) {
    return this.prisma.bill.findMany({
      where: { clientId, ...(status ? { status: status as any } : {}) },
      include: { supplier: true, lines: true },
      orderBy: { date: "desc" },
    });
  }

  async get(clientId: string, billId: string) {
    const bill = await this.prisma.bill.findUnique({
      where: { id: billId },
      include: { supplier: true, lines: { include: { expenseAccount: true } }, journal: { include: { lines: true } } },
    });
    if (!bill || bill.clientId !== clientId) throw new NotFoundException("Bill not found");
    return bill;
  }

  async create(actor: RequestUser, clientId: string, dto: CreateBillDto) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: dto.supplierId } });
    if (!supplier || supplier.clientId !== clientId) throw new BadRequestException("Supplier not found");

    const existing = await this.prisma.bill.findUnique({
      where: { clientId_billNumber: { clientId, billNumber: dto.billNumber } },
    });
    if (existing) throw new BadRequestException(`Bill number ${dto.billNumber} already exists`);

    let subtotal = 0;
    let taxTotal = 0;
    const lineData = dto.lines.map((line, i) => {
      const lineSubtotal = round2(line.quantity * line.unitPrice);
      const lineTax = round2(lineSubtotal * ((line.taxRate ?? 0) / 100));
      subtotal += lineSubtotal;
      taxTotal += lineTax;
      return {
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxRate: line.taxRate ?? 0,
        lineTotal: lineSubtotal,
        expenseAccountId: line.expenseAccountId,
        lineNumber: i + 1,
      };
    });
    subtotal = round2(subtotal);
    taxTotal = round2(taxTotal);
    const total = round2(subtotal + taxTotal);

    const bill = await this.prisma.bill.create({
      data: {
        clientId,
        supplierId: dto.supplierId,
        billNumber: dto.billNumber,
        date: new Date(dto.date),
        dueDate: new Date(dto.dueDate),
        notes: dto.notes,
        subtotal,
        taxTotal,
        total,
        status: "DRAFT",
        lines: { create: lineData },
      },
      include: { lines: true },
    });

    await this.audit.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "BILL_CREATED",
      entityType: "Bill",
      entityId: bill.id,
      after: bill,
    });
    return bill;
  }

  async post(actor: RequestUser, clientId: string, billId: string) {
    return this.prisma.$transaction(async (tx) => {
      const bill = await tx.bill.findUnique({ where: { id: billId }, include: { lines: true, supplier: true } });
      if (!bill || bill.clientId !== clientId) throw new NotFoundException("Bill not found");
      if (bill.status !== "DRAFT") throw new BadRequestException("Only a draft bill can be posted");

      const apAccountId =
        bill.supplier.apAccountId ??
        (await tx.chartOfAccount.findFirst({ where: { clientId, controlAccountType: "ACCOUNTS_PAYABLE" } }))?.id;
      if (!apAccountId) throw new BadRequestException("No Accounts Payable control account configured");

      const expenseByAccount = new Map<string, number>();
      for (const line of bill.lines) {
        expenseByAccount.set(
          line.expenseAccountId,
          round2((expenseByAccount.get(line.expenseAccountId) ?? 0) + Number(line.lineTotal)),
        );
      }

      const lines = [
        ...[...expenseByAccount.entries()].map(([accountId, amount]) => ({
          accountId,
          debit: amount,
          credit: 0,
          description: `Bill ${bill.billNumber}`,
        })),
        { accountId: apAccountId, debit: 0, credit: Number(bill.total), description: `Bill ${bill.billNumber}` },
      ];

      if (Number(bill.taxTotal) > 0) {
        const vatAccount = await tx.chartOfAccount.findFirst({ where: { clientId, controlAccountType: "VAT_INPUT" } });
        if (!vatAccount) throw new BadRequestException("No VAT Input control account configured");
        lines.push({
          accountId: vatAccount.id,
          debit: Number(bill.taxTotal),
          credit: 0,
          description: `VAT on bill ${bill.billNumber}`,
        });
      }

      const journal = await this.journals.postSystemJournal(tx, {
        clientId,
        date: bill.date,
        description: `Purchase bill ${bill.billNumber}`,
        source: "PURCHASES",
        sourceType: "Bill",
        sourceId: bill.id,
        lines,
        actorId: actor.id,
      });

      const posted = await tx.bill.update({ where: { id: billId }, data: { status: "POSTED", journalId: journal.id } });

      await this.audit.log(
        {
          firmId: actor.firmId,
          clientId,
          userId: actor.id,
          action: "BILL_POSTED",
          entityType: "Bill",
          entityId: billId,
          after: { journalId: journal.id },
        },
        tx,
      );

      return posted;
    });
  }
}

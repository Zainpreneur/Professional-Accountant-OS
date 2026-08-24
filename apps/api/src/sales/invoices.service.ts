import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { JournalsService } from "../accounting/journals/journals.service";
import { AuditService } from "../audit/audit.service";
import type { CreateInvoiceDto } from "./dto/invoice.dto";
import type { RequestUser } from "../common/types";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

// Sales / AR (SRS 14, 18). An invoice starts as a DRAFT (edit freely, no GL
// impact) and only touches the ledger once posted: Debit Accounts
// Receivable for the total, Credit each revenue account for its line
// subtotal, Credit VAT Output for the tax collected. This mirrors the
// "prepare -> approve -> post" authority model in SRS 4.
@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly journals: JournalsService,
    private readonly audit: AuditService,
  ) {}

  list(clientId: string, status?: string) {
    return this.prisma.invoice.findMany({
      where: { clientId, ...(status ? { status: status as any } : {}) },
      include: { customer: true, lines: true },
      orderBy: { date: "desc" },
    });
  }

  async get(clientId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true, lines: { include: { revenueAccount: true } }, journal: { include: { lines: true } } },
    });
    if (!invoice || invoice.clientId !== clientId) throw new NotFoundException("Invoice not found");
    return invoice;
  }

  async create(actor: RequestUser, clientId: string, dto: CreateInvoiceDto) {
    const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId } });
    if (!customer || customer.clientId !== clientId) throw new BadRequestException("Customer not found");

    const existing = await this.prisma.invoice.findUnique({
      where: { clientId_invoiceNumber: { clientId, invoiceNumber: dto.invoiceNumber } },
    });
    if (existing) throw new BadRequestException(`Invoice number ${dto.invoiceNumber} already exists`);

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
        revenueAccountId: line.revenueAccountId,
        lineNumber: i + 1,
      };
    });
    subtotal = round2(subtotal);
    taxTotal = round2(taxTotal);
    const total = round2(subtotal + taxTotal);

    const invoice = await this.prisma.invoice.create({
      data: {
        clientId,
        customerId: dto.customerId,
        invoiceNumber: dto.invoiceNumber,
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
      action: "INVOICE_CREATED",
      entityType: "Invoice",
      entityId: invoice.id,
      after: invoice,
    });
    return invoice;
  }

  async post(actor: RequestUser, clientId: string, invoiceId: string) {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
        include: { lines: true, customer: true },
      });
      if (!invoice || invoice.clientId !== clientId) throw new NotFoundException("Invoice not found");
      if (invoice.status !== "DRAFT") throw new BadRequestException("Only a draft invoice can be posted");

      const arAccountId =
        invoice.customer.arAccountId ??
        (await tx.chartOfAccount.findFirst({ where: { clientId, controlAccountType: "ACCOUNTS_RECEIVABLE" } }))?.id;
      if (!arAccountId) throw new BadRequestException("No Accounts Receivable control account configured");

      const revenueByAccount = new Map<string, number>();
      for (const line of invoice.lines) {
        revenueByAccount.set(
          line.revenueAccountId,
          round2((revenueByAccount.get(line.revenueAccountId) ?? 0) + Number(line.lineTotal)),
        );
      }

      const lines = [
        { accountId: arAccountId, debit: Number(invoice.total), credit: 0, description: `Invoice ${invoice.invoiceNumber}` },
        ...[...revenueByAccount.entries()].map(([accountId, amount]) => ({
          accountId,
          debit: 0,
          credit: amount,
          description: `Invoice ${invoice.invoiceNumber}`,
        })),
      ];

      if (Number(invoice.taxTotal) > 0) {
        const vatAccount = await tx.chartOfAccount.findFirst({ where: { clientId, controlAccountType: "VAT_OUTPUT" } });
        if (!vatAccount) throw new BadRequestException("No VAT Output control account configured");
        lines.push({
          accountId: vatAccount.id,
          debit: 0,
          credit: Number(invoice.taxTotal),
          description: `VAT on invoice ${invoice.invoiceNumber}`,
        });
      }

      const journal = await this.journals.postSystemJournal(tx, {
        clientId,
        date: invoice.date,
        description: `Sales invoice ${invoice.invoiceNumber}`,
        source: "SALES",
        sourceType: "Invoice",
        sourceId: invoice.id,
        lines,
        actorId: actor.id,
      });

      const posted = await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: "POSTED", journalId: journal.id },
      });

      await this.audit.log(
        {
          firmId: actor.firmId,
          clientId,
          userId: actor.id,
          action: "INVOICE_POSTED",
          entityType: "Invoice",
          entityId: invoiceId,
          after: { journalId: journal.id },
        },
        tx,
      );

      return posted;
    });
  }
}

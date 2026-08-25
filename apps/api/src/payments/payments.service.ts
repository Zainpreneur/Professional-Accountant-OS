import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { JournalsService } from "../accounting/journals/journals.service";
import { AuditService } from "../audit/audit.service";
import type { CreatePaymentDto } from "./dto/payment.dto";
import type { RequestUser } from "../common/types";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

// Payments (SRS 14-17): a receipt allocates cash against one or more open
// invoices for a customer; a payment allocates cash against one or more
// open bills for a supplier. Posting always moves the full `amount`
// between the bank/cash account and the AR/AP control account; the
// allocations only decide which subledger documents get marked paid.
@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly journals: JournalsService,
    private readonly audit: AuditService,
  ) {}

  list(clientId: string) {
    return this.prisma.payment.findMany({
      where: { clientId },
      include: { customer: true, supplier: true, allocations: true },
      orderBy: { date: "desc" },
    });
  }

  async create(actor: RequestUser, clientId: string, dto: CreatePaymentDto) {
    if (dto.type === "RECEIPT" && !dto.customerId) throw new BadRequestException("customerId is required for a receipt");
    if (dto.type === "PAYMENT" && !dto.supplierId) throw new BadRequestException("supplierId is required for a payment");

    const allocatedTotal = round2(dto.allocations.reduce((sum, a) => sum + a.amount, 0));
    if (Math.abs(allocatedTotal - round2(dto.amount)) > 0.005) {
      throw new BadRequestException("Allocation amounts must sum to the payment amount");
    }

    const whtAmount = round2(dto.whtAmount ?? 0);
    if (whtAmount > 0) {
      if (dto.type !== "PAYMENT") throw new BadRequestException("whtAmount only applies to a PAYMENT");
      if (!dto.whtPayableAccountId) throw new BadRequestException("whtPayableAccountId is required when whtAmount is set");
      if (whtAmount > dto.amount + 0.005) throw new BadRequestException("whtAmount cannot exceed the payment amount");
    }

    return this.prisma.$transaction(async (tx) => {
      const bankAccount = await tx.chartOfAccount.findUnique({ where: { id: dto.bankAccountId } });
      if (!bankAccount || bankAccount.clientId !== clientId) throw new BadRequestException("Bank account not found");
      if (bankAccount.controlAccountType !== "BANK" && bankAccount.controlAccountType !== "CASH") {
        throw new BadRequestException("bankAccountId must reference a bank or cash control account");
      }

      let controlAccountId: string | undefined;
      let whtCategoryCodeSnapshot: string | undefined;

      if (dto.type === "RECEIPT") {
        const customer = await tx.customer.findUnique({ where: { id: dto.customerId! } });
        if (!customer || customer.clientId !== clientId) throw new BadRequestException("Customer not found");
        controlAccountId =
          customer.arAccountId ??
          (await tx.chartOfAccount.findFirst({ where: { clientId, controlAccountType: "ACCOUNTS_RECEIVABLE" } }))?.id;

        for (const alloc of dto.allocations) {
          if (!alloc.invoiceId) throw new BadRequestException("Receipt allocations must reference an invoiceId");
          const invoice = await tx.invoice.findUnique({ where: { id: alloc.invoiceId } });
          if (!invoice || invoice.clientId !== clientId || invoice.customerId !== dto.customerId) {
            throw new BadRequestException("Allocated invoice not found for this customer");
          }
          const outstanding = round2(Number(invoice.total) - Number(invoice.amountPaid));
          if (alloc.amount > outstanding + 0.005) {
            throw new BadRequestException(`Allocation exceeds outstanding balance on invoice ${invoice.invoiceNumber}`);
          }
          const newPaid = round2(Number(invoice.amountPaid) + alloc.amount);
          await tx.invoice.update({
            where: { id: invoice.id },
            data: { amountPaid: newPaid, status: newPaid >= Number(invoice.total) - 0.005 ? "PAID" : "PARTIALLY_PAID" },
          });
        }
      } else {
        const supplier = await tx.supplier.findUnique({ where: { id: dto.supplierId! } });
        if (!supplier || supplier.clientId !== clientId) throw new BadRequestException("Supplier not found");
        whtCategoryCodeSnapshot = supplier.whtCategoryCode ?? undefined;
        controlAccountId =
          supplier.apAccountId ??
          (await tx.chartOfAccount.findFirst({ where: { clientId, controlAccountType: "ACCOUNTS_PAYABLE" } }))?.id;

        for (const alloc of dto.allocations) {
          if (!alloc.billId) throw new BadRequestException("Payment allocations must reference a billId");
          const bill = await tx.bill.findUnique({ where: { id: alloc.billId } });
          if (!bill || bill.clientId !== clientId || bill.supplierId !== dto.supplierId) {
            throw new BadRequestException("Allocated bill not found for this supplier");
          }
          const outstanding = round2(Number(bill.total) - Number(bill.amountPaid));
          if (alloc.amount > outstanding + 0.005) {
            throw new BadRequestException(`Allocation exceeds outstanding balance on bill ${bill.billNumber}`);
          }
          const newPaid = round2(Number(bill.amountPaid) + alloc.amount);
          await tx.bill.update({
            where: { id: bill.id },
            data: { amountPaid: newPaid, status: newPaid >= Number(bill.total) - 0.005 ? "PAID" : "PARTIALLY_PAID" },
          });
        }
      }

      if (!controlAccountId) {
        throw new BadRequestException(
          `No ${dto.type === "RECEIPT" ? "Accounts Receivable" : "Accounts Payable"} control account configured`,
        );
      }

      const netBankAmount = round2(dto.amount - whtAmount);
      const journalLines =
        dto.type === "RECEIPT"
          ? [
              { accountId: dto.bankAccountId, debit: dto.amount, credit: 0, description: dto.reference },
              { accountId: controlAccountId, debit: 0, credit: dto.amount, description: dto.reference },
            ]
          : [
              { accountId: controlAccountId, debit: dto.amount, credit: 0, description: dto.reference },
              { accountId: dto.bankAccountId, debit: 0, credit: netBankAmount, description: dto.reference },
              // Only present when whtAmount > 0 (SRS 28) - the portion
              // withheld instead of remitted to the supplier.
              ...(whtAmount > 0.005
                ? [{ accountId: dto.whtPayableAccountId!, debit: 0, credit: whtAmount, description: `WHT on ${dto.reference ?? "payment"}` }]
                : []),
            ];

      const journal = await this.journals.postSystemJournal(tx, {
        clientId,
        date: new Date(dto.date),
        description: `${dto.type === "RECEIPT" ? "Receipt" : "Payment"}${dto.reference ? ` - ${dto.reference}` : ""}`,
        source: dto.type,
        sourceType: "Payment",
        sourceId: "pending", // replaced below once the Payment row exists
        lines: journalLines,
        actorId: actor.id,
      });

      const payment = await tx.payment.create({
        data: {
          clientId,
          type: dto.type,
          customerId: dto.customerId,
          supplierId: dto.supplierId,
          date: new Date(dto.date),
          amount: dto.amount,
          bankAccountId: dto.bankAccountId,
          method: dto.method,
          reference: dto.reference,
          whtAmount,
          whtCategoryCode: whtAmount > 0 ? whtCategoryCodeSnapshot : undefined,
          whtPayableAccountId: whtAmount > 0 ? dto.whtPayableAccountId : undefined,
          journalId: journal.id,
          allocations: {
            create: dto.allocations.map((a) => ({ invoiceId: a.invoiceId, billId: a.billId, amount: a.amount })),
          },
        },
        include: { allocations: true },
      });

      await tx.journal.update({ where: { id: journal.id }, data: { sourceId: payment.id } });

      await this.audit.log(
        {
          firmId: actor.firmId,
          clientId,
          userId: actor.id,
          action: dto.type === "RECEIPT" ? "RECEIPT_RECORDED" : "PAYMENT_RECORDED",
          entityType: "Payment",
          entityId: payment.id,
          after: payment,
        },
        tx,
      );

      return payment;
    });
  }
}

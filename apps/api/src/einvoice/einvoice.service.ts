import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import * as QRCode from "qrcode";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { buildZatcaQrPayloadBase64 } from "./zatca-qr";
import { buildInvoiceXml } from "./invoice-xml";
import type { RequestUser } from "../common/types";

// ZATCA-shaped e-invoicing v1 (SRS 26) - local generation only. See
// zatca-qr.ts and invoice-xml.ts for exactly what is and isn't implemented;
// docs/ARCHITECTURE.md spells out the gap to a real Fatoora integration.
@Injectable()
export class EInvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async generate(actor: RequestUser, clientId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true, lines: true, client: true },
    });
    if (!invoice || invoice.clientId !== clientId) throw new NotFoundException("Invoice not found");
    if (invoice.status === "DRAFT" || invoice.status === "VOID") {
      throw new BadRequestException("Only a posted invoice can generate an e-invoice record");
    }
    if (!invoice.client.taxRegistrationNumber) {
      throw new BadRequestException("Client has no tax registration number configured");
    }

    const qrPayloadBase64 = buildZatcaQrPayloadBase64({
      sellerName: invoice.client.legalName,
      vatRegistrationNumber: invoice.client.taxRegistrationNumber,
      timestamp: invoice.date,
      invoiceTotal: Number(invoice.total),
      vatTotal: Number(invoice.taxTotal),
    });

    const xmlContent = buildInvoiceXml({
      invoiceNumber: invoice.invoiceNumber,
      date: invoice.date,
      sellerName: invoice.client.legalName,
      sellerVatNumber: invoice.client.taxRegistrationNumber,
      buyerName: invoice.customer.name,
      currency: invoice.currency,
      lines: invoice.lines.map((l) => ({
        description: l.description,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        taxRate: Number(l.taxRate),
        lineTotal: Number(l.lineTotal),
      })),
      subtotal: Number(invoice.subtotal),
      taxTotal: Number(invoice.taxTotal),
      total: Number(invoice.total),
      qrPayloadBase64,
    });

    const record = await this.prisma.eInvoiceRecord.upsert({
      where: { invoiceId },
      update: { qrPayloadBase64, xmlContent, generatedAt: new Date() },
      create: { invoiceId, qrPayloadBase64, xmlContent },
    });

    await this.audit.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "EINVOICE_GENERATED",
      entityType: "EInvoiceRecord",
      entityId: record.id,
      after: { invoiceId },
    });
    return record;
  }

  async get(clientId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice || invoice.clientId !== clientId) throw new NotFoundException("Invoice not found");
    const record = await this.prisma.eInvoiceRecord.findUnique({ where: { invoiceId } });
    if (!record) throw new NotFoundException("No e-invoice record generated yet for this invoice");
    return record;
  }

  async getQrPng(clientId: string, invoiceId: string): Promise<Buffer> {
    const record = await this.get(clientId, invoiceId);
    return QRCode.toBuffer(record.qrPayloadBase64, { type: "png", margin: 1, width: 300 });
  }
}

import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { JournalsService } from "../accounting/journals/journals.service";
import { AuditService } from "../audit/audit.service";
import type { FileVatReturnDto, GenerateVatReturnDto } from "./dto/vat-return.dto";
import type { RequestUser } from "../common/types";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

// VAT Returns (SRS 25-26). A return is computed live from posted journal
// activity on the client's VAT_OUTPUT/VAT_INPUT control accounts within the
// tax period's date range - never from a running total that could drift
// from the ledger. Filing nets that period's output/input VAT into a
// single payable-or-receivable line via a balanced settlement journal
// (see the sign-handling proof in the docstring on `file`).
@Injectable()
export class VatReturnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly journals: JournalsService,
    private readonly audit: AuditService,
  ) {}

  list(clientId: string) {
    return this.prisma.vatReturn.findMany({ where: { clientId }, include: { taxPeriod: true }, orderBy: { createdAt: "desc" } });
  }

  private async computePosition(clientId: string, taxPeriodId: string) {
    const taxPeriod = await this.prisma.taxPeriod.findUnique({ where: { id: taxPeriodId } });
    if (!taxPeriod || taxPeriod.clientId !== clientId) throw new NotFoundException("Tax period not found");
    if (taxPeriod.periodType !== "VAT") throw new BadRequestException("Tax period is not a VAT period");

    const lines = await this.prisma.journalLine.findMany({
      where: {
        journal: { clientId, status: { in: ["POSTED", "REVERSED"] }, date: { gte: taxPeriod.startDate, lte: taxPeriod.endDate } },
        account: { controlAccountType: { in: ["VAT_OUTPUT", "VAT_INPUT"] } },
      },
      include: { account: true },
    });

    let outputVat = 0;
    let inputVat = 0;
    for (const line of lines) {
      if (line.account.controlAccountType === "VAT_OUTPUT") {
        outputVat = round2(outputVat + Number(line.credit) - Number(line.debit));
      } else {
        inputVat = round2(inputVat + Number(line.debit) - Number(line.credit));
      }
    }
    return { taxPeriod, outputVat, inputVat, netVatDue: round2(outputVat - inputVat) };
  }

  async generate(actor: RequestUser, clientId: string, dto: GenerateVatReturnDto) {
    const existing = await this.prisma.vatReturn.findUnique({ where: { taxPeriodId: dto.taxPeriodId } });
    if (existing) throw new BadRequestException("A VAT return already exists for this period");

    const { outputVat, inputVat, netVatDue } = await this.computePosition(clientId, dto.taxPeriodId);

    const vatReturn = await this.prisma.vatReturn.create({
      data: { clientId, taxPeriodId: dto.taxPeriodId, outputVat, inputVat, netVatDue, status: "DRAFT" },
    });

    await this.audit.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "VAT_RETURN_GENERATED",
      entityType: "VatReturn",
      entityId: vatReturn.id,
      after: vatReturn,
    });
    return vatReturn;
  }

  // Settlement journal, whichever way the position nets:
  //   Debit  VAT_OUTPUT  outputVat          (clears this period's output VAT)
  //   Credit VAT_INPUT   inputVat           (clears this period's input VAT)
  //   netVatDue >= 0: Credit payableAccountId netVatDue   (amount owed)
  //   netVatDue <  0: Debit  payableAccountId -netVatDue  (amount refundable)
  // Both branches balance because netVatDue = outputVat - inputVat by
  // construction - see apps/api/test/phase3.spec.ts for the proof in test form.
  async file(actor: RequestUser, clientId: string, vatReturnId: string, dto: FileVatReturnDto) {
    return this.prisma.$transaction(async (tx) => {
      const vatReturn = await tx.vatReturn.findUnique({ where: { id: vatReturnId }, include: { taxPeriod: true } });
      if (!vatReturn || vatReturn.clientId !== clientId) throw new NotFoundException("VAT return not found");
      if (vatReturn.status !== "DRAFT") throw new BadRequestException("Only a draft VAT return can be filed");

      // Recompute fresh in case activity posted after generate().
      const { outputVat, inputVat, netVatDue } = await this.computePosition(clientId, vatReturn.taxPeriodId);

      const lines: Array<{ accountId: string; debit: number; credit: number; description: string }> = [];
      const outputAccount = await tx.chartOfAccount.findFirst({ where: { clientId, controlAccountType: "VAT_OUTPUT" } });
      const inputAccount = await tx.chartOfAccount.findFirst({ where: { clientId, controlAccountType: "VAT_INPUT" } });

      if (outputVat > 0.005) {
        if (!outputAccount) throw new BadRequestException("No VAT Output control account configured");
        lines.push({ accountId: outputAccount.id, debit: outputVat, credit: 0, description: `VAT settlement ${vatReturn.taxPeriod.name}` });
      }
      if (inputVat > 0.005) {
        if (!inputAccount) throw new BadRequestException("No VAT Input control account configured");
        lines.push({ accountId: inputAccount.id, debit: 0, credit: inputVat, description: `VAT settlement ${vatReturn.taxPeriod.name}` });
      }
      if (Math.abs(netVatDue) > 0.005) {
        lines.push(
          netVatDue > 0
            ? { accountId: dto.payableAccountId, debit: 0, credit: netVatDue, description: `VAT payable ${vatReturn.taxPeriod.name}` }
            : { accountId: dto.payableAccountId, debit: -netVatDue, credit: 0, description: `VAT receivable ${vatReturn.taxPeriod.name}` },
        );
      }

      if (lines.length < 2) {
        throw new BadRequestException("No VAT activity to file for this period");
      }

      const journal = await this.journals.postSystemJournal(tx, {
        clientId,
        date: vatReturn.taxPeriod.endDate,
        description: `VAT return ${vatReturn.taxPeriod.name}`,
        source: "SYSTEM",
        sourceType: "VatReturn",
        sourceId: vatReturn.id,
        lines,
        actorId: actor.id,
      });

      const filed = await tx.vatReturn.update({
        where: { id: vatReturnId },
        data: {
          outputVat,
          inputVat,
          netVatDue,
          status: "FILED",
          payableAccountId: dto.payableAccountId,
          journalId: journal.id,
          filedById: actor.id,
          filedAt: new Date(),
        },
      });

      await this.audit.log(
        {
          firmId: actor.firmId,
          clientId,
          userId: actor.id,
          action: "VAT_RETURN_FILED",
          entityType: "VatReturn",
          entityId: vatReturnId,
          after: { netVatDue, journalId: journal.id },
        },
        tx,
      );

      return filed;
    });
  }
}

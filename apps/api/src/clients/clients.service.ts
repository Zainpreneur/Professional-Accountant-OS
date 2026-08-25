import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { BusinessCompilerService } from "../business-compiler/business-compiler.service";
import type { CreateClientDto, UpdateClientDto } from "./dto/create-client.dto";
import type { RequestUser } from "../common/types";

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly businessCompiler: BusinessCompilerService,
  ) {}

  list(firmId: string) {
    return this.prisma.client.findMany({ where: { firmId }, orderBy: { createdAt: "desc" } });
  }

  async get(firmId: string, clientId: string) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client || client.firmId !== firmId) throw new NotFoundException("Client not found");
    return client;
  }

  // Client onboarding (SRS 6, 59-60): creates the Client plus a starter
  // chart of accounts composed by the Business Compiler from the client's
  // jurisdiction and business category (not one fixed template for every
  // client - see BusinessCompilerService), a current fiscal year, and its
  // monthly accounting periods, so the client can start recording
  // transactions immediately. resolveBusinessCategory/resolveJurisdiction
  // throw a 400 for an unrecognized value before anything is written, and
  // normalize casing/whitespace so what lands on the Client record always
  // matches a real template.
  async create(actor: RequestUser, dto: CreateClientDto) {
    const businessCategory = this.businessCompiler.resolveBusinessCategory(dto.businessCategory);
    const jurisdiction = this.businessCompiler.resolveJurisdiction(dto.jurisdiction);
    const { accounts } = this.businessCompiler.compile(businessCategory, jurisdiction);

    const client = await this.prisma.$transaction(async (tx) => {
      const created = await tx.client.create({
        data: {
          firmId: actor.firmId,
          legalName: dto.legalName,
          tradingName: dto.tradingName,
          entityType: dto.entityType,
          businessCategory,
          jurisdiction,
          taxRegistrationNumber: dto.taxRegistrationNumber,
          baseCurrency: dto.baseCurrency ?? this.businessCompiler.defaultCurrencyFor(jurisdiction),
        },
      });

      await tx.chartOfAccount.createMany({
        data: accounts.map((a) => ({ ...a, clientId: created.id })),
      });

      const now = new Date();
      const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
      const yearEnd = new Date(Date.UTC(now.getUTCFullYear(), 11, 31));
      const fiscalYear = await tx.fiscalYear.create({
        data: { clientId: created.id, name: String(now.getUTCFullYear()), startDate: yearStart, endDate: yearEnd },
      });

      const periods = Array.from({ length: 12 }, (_, i) => {
        const start = new Date(Date.UTC(now.getUTCFullYear(), i, 1));
        const end = new Date(Date.UTC(now.getUTCFullYear(), i + 1, 0));
        return {
          clientId: created.id,
          fiscalYearId: fiscalYear.id,
          name: `${now.getUTCFullYear()}-${String(i + 1).padStart(2, "0")}`,
          startDate: start,
          endDate: end,
        };
      });
      await tx.accountingPeriod.createMany({ data: periods });

      await this.audit.log(
        {
          firmId: actor.firmId,
          clientId: created.id,
          userId: actor.id,
          action: "CLIENT_CREATED",
          entityType: "Client",
          entityId: created.id,
          after: created,
        },
        tx,
      );

      return created;
    });

    return client;
  }

  async update(actor: RequestUser, clientId: string, dto: UpdateClientDto) {
    const before = await this.get(actor.firmId, clientId);
    const updated = await this.prisma.client.update({
      where: { id: clientId },
      data: dto as any,
    });
    await this.audit.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "CLIENT_UPDATED",
      entityType: "Client",
      entityId: clientId,
      before,
      after: updated,
    });
    return updated;
  }
}

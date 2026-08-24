import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../../audit/audit.service";
import type { CreateAccountDto, UpdateAccountDto } from "./dto/create-account.dto";
import type { RequestUser } from "../../common/types";

@Injectable()
export class ChartOfAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(clientId: string) {
    return this.prisma.chartOfAccount.findMany({
      where: { clientId },
      orderBy: { code: "asc" },
    });
  }

  async create(actor: RequestUser, clientId: string, dto: CreateAccountDto) {
    const existing = await this.prisma.chartOfAccount.findUnique({
      where: { clientId_code: { clientId, code: dto.code } },
    });
    if (existing) throw new BadRequestException(`Account code ${dto.code} already exists for this client`);

    const account = await this.prisma.chartOfAccount.create({
      data: { ...dto, clientId } as any,
    });

    await this.audit.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "ACCOUNT_CREATED",
      entityType: "ChartOfAccount",
      entityId: account.id,
      after: account,
    });
    return account;
  }

  async update(actor: RequestUser, clientId: string, accountId: string, dto: UpdateAccountDto) {
    const before = await this.prisma.chartOfAccount.findUnique({ where: { id: accountId } });
    if (!before || before.clientId !== clientId) throw new NotFoundException("Account not found");

    const account = await this.prisma.chartOfAccount.update({ where: { id: accountId }, data: dto });
    await this.audit.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "ACCOUNT_UPDATED",
      entityType: "ChartOfAccount",
      entityId: accountId,
      before,
      after: account,
    });
    return account;
  }
}

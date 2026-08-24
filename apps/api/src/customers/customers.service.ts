import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { CreateCustomerDto, UpdateCustomerDto } from "./dto/customer.dto";
import type { RequestUser } from "../common/types";

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(clientId: string) {
    return this.prisma.customer.findMany({ where: { clientId }, orderBy: { name: "asc" } });
  }

  async create(actor: RequestUser, clientId: string, dto: CreateCustomerDto) {
    const existing = await this.prisma.customer.findUnique({ where: { clientId_code: { clientId, code: dto.code } } });
    if (existing) throw new BadRequestException(`Customer code ${dto.code} already exists`);

    const arAccount = await this.prisma.chartOfAccount.findFirst({
      where: { clientId, controlAccountType: "ACCOUNTS_RECEIVABLE" },
    });

    const customer = await this.prisma.customer.create({
      data: { ...dto, clientId, arAccountId: arAccount?.id },
    });
    await this.audit.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "CUSTOMER_CREATED",
      entityType: "Customer",
      entityId: customer.id,
      after: customer,
    });
    return customer;
  }

  async update(actor: RequestUser, clientId: string, customerId: string, dto: UpdateCustomerDto) {
    const before = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!before || before.clientId !== clientId) throw new NotFoundException("Customer not found");

    const customer = await this.prisma.customer.update({ where: { id: customerId }, data: dto });
    await this.audit.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "CUSTOMER_UPDATED",
      entityType: "Customer",
      entityId: customerId,
      before,
      after: customer,
    });
    return customer;
  }
}

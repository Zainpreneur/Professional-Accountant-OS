import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { CreateSupplierDto, UpdateSupplierDto } from "./dto/supplier.dto";
import type { RequestUser } from "../common/types";

@Injectable()
export class SuppliersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(clientId: string) {
    return this.prisma.supplier.findMany({ where: { clientId }, orderBy: { name: "asc" } });
  }

  async create(actor: RequestUser, clientId: string, dto: CreateSupplierDto) {
    const existing = await this.prisma.supplier.findUnique({ where: { clientId_code: { clientId, code: dto.code } } });
    if (existing) throw new BadRequestException(`Supplier code ${dto.code} already exists`);

    const apAccount = await this.prisma.chartOfAccount.findFirst({
      where: { clientId, controlAccountType: "ACCOUNTS_PAYABLE" },
    });

    const supplier = await this.prisma.supplier.create({
      data: { ...dto, clientId, apAccountId: apAccount?.id },
    });
    await this.audit.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "SUPPLIER_CREATED",
      entityType: "Supplier",
      entityId: supplier.id,
      after: supplier,
    });
    return supplier;
  }

  async update(actor: RequestUser, clientId: string, supplierId: string, dto: UpdateSupplierDto) {
    const before = await this.prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!before || before.clientId !== clientId) throw new NotFoundException("Supplier not found");

    const supplier = await this.prisma.supplier.update({ where: { id: supplierId }, data: dto });
    await this.audit.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "SUPPLIER_UPDATED",
      entityType: "Supplier",
      entityId: supplierId,
      before,
      after: supplier,
    });
    return supplier;
  }
}

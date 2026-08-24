import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { InviteUserDto } from "./dto/invite-user.dto";
import type { RequestUser } from "../common/types";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(firmId: string) {
    return this.prisma.user.findMany({
      where: { firmId },
      include: { userRoles: { include: { role: true } } },
      orderBy: { createdAt: "asc" },
    });
  }

  async invite(actor: RequestUser, dto: InviteUserDto) {
    const existing = await this.prisma.user.findFirst({ where: { email: dto.email } });
    if (existing) throw new ConflictException("Email already registered");

    const roles = await this.prisma.role.findMany({
      where: { name: { in: dto.roleNames }, OR: [{ firmId: actor.firmId }, { firmId: null }] },
    });
    if (roles.length !== dto.roleNames.length) {
      throw new BadRequestException("One or more roles not found for this firm");
    }

    const temporaryPassword = dto.temporaryPassword ?? randomUUID();
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          firmId: actor.firmId,
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          status: "INVITED",
        },
      });

      await tx.userRole.createMany({
        data: roles.map((role) => ({ userId: created.id, roleId: role.id, clientId: null })),
      });

      await this.audit.log(
        {
          firmId: actor.firmId,
          userId: actor.id,
          action: "USER_INVITED",
          entityType: "User",
          entityId: created.id,
          after: { email: created.email, roles: dto.roleNames },
        },
        tx,
      );

      return created;
    });

    // In a production deployment this would trigger an email invite instead
    // of returning the password (SRS 78 Notifications). Returned here so the
    // flow is usable end-to-end without an email provider configured.
    return { user, temporaryPassword };
  }

  listRoles(firmId: string) {
    return this.prisma.role.findMany({ where: { OR: [{ firmId }, { firmId: null }] } });
  }
}

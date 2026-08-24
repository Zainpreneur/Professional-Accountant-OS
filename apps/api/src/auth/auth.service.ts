import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { SYSTEM_ROLES } from "../rbac/permissions";
import type { RegisterFirmDto } from "./dto/register.dto";
import type { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
  ) {}

  // Self-service firm signup: creates the Firm, the FIRM_OWNER system role
  // (idempotently, scoped to this firm), the first User, and assigns them
  // the role firm-wide. This is the entry point for "Firm Owner / Managing
  // Partner" (SRS 3.1) onboarding a brand new practice.
  async registerFirm(dto: RegisterFirmDto) {
    const existing = await this.prisma.user.findFirst({ where: { email: dto.email } });
    if (existing) throw new ConflictException("Email already registered");

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const result = await this.prisma.$transaction(async (tx) => {
      const firm = await tx.firm.create({ data: { name: dto.firmName } });

      const ownerRoleDef = SYSTEM_ROLES.FIRM_OWNER;
      const ownerRole = await tx.role.create({
        data: {
          firmId: firm.id,
          name: "FIRM_OWNER",
          description: ownerRoleDef.description,
          permissions: ownerRoleDef.permissions,
        },
      });

      const user = await tx.user.create({
        data: {
          firmId: firm.id,
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          status: "ACTIVE",
        },
      });

      await tx.userRole.create({
        data: { userId: user.id, roleId: ownerRole.id, clientId: null },
      });

      await this.audit.log(
        {
          firmId: firm.id,
          userId: user.id,
          action: "FIRM_REGISTERED",
          entityType: "Firm",
          entityId: firm.id,
          after: { name: firm.name, ownerEmail: user.email },
        },
        tx,
      );

      return { firm, user };
    });

    return this.issueToken(result.user.id, result.user.email);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException("Invalid credentials");

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException("Invalid credentials");
    if (user.status !== "ACTIVE") throw new UnauthorizedException("Account is not active");

    return this.issueToken(user.id, user.email);
  }

  private issueToken(userId: string, email: string) {
    const accessToken = this.jwt.sign({ sub: userId, email });
    return { accessToken };
  }
}

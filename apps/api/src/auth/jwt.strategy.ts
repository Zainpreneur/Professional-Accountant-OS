import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../prisma/prisma.service";
import type { RequestUser } from "../common/types";
import type { PermissionCode } from "../rbac/permissions";

interface JwtPayload {
  sub: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? "change-me-in-production",
    });
  }

  // Runs on every authenticated request. We re-load the user's roles fresh
  // (rather than trusting a stale JWT claim) so a permission/role change
  // takes effect immediately, not just on next login.
  async validate(payload: JwtPayload): Promise<RequestUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user || user.status === "SUSPENDED") {
      throw new UnauthorizedException();
    }

    const firmWidePermissions = new Set<PermissionCode>();
    const clientPermissions: Record<string, Set<PermissionCode>> = {};

    for (const ur of user.userRoles) {
      const perms = ur.role.permissions as PermissionCode[];
      if (ur.clientId === null) {
        perms.forEach((p) => firmWidePermissions.add(p));
      } else {
        const clientId = ur.clientId;
        clientPermissions[clientId] ??= new Set();
        perms.forEach((p) => clientPermissions[clientId].add(p));
      }
    }

    return {
      id: user.id,
      firmId: user.firmId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      firmWidePermissions: [...firmWidePermissions],
      clientPermissions: Object.fromEntries(Object.entries(clientPermissions).map(([k, v]) => [k, [...v]])),
    };
  }
}

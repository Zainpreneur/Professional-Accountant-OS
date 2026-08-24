import { CanActivate, ExecutionContext, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { RequestUser } from "../common/types";

// Enforces tenant isolation (SRS 5, 53): any route with a :clientId param
// must resolve to a Client owned by the caller's firm, or the caller gets a
// 404 (never a 403 - we don't want to leak the existence of other firms'
// clients). Attaches the loaded Client to request.client for handlers that
// need it.
@Injectable()
export class ClientTenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: RequestUser | undefined = request.user;
    if (!user) throw new ForbiddenException("Not authenticated");

    const clientId: string | undefined = request.params?.clientId;
    if (!clientId) return true; // route doesn't target a specific client

    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client || client.firmId !== user.firmId) {
      throw new NotFoundException("Client not found");
    }
    request.client = client;
    return true;
  }
}

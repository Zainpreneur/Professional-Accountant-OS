import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "./permissions.decorator";
import type { PermissionCode } from "./permissions";
import { userHasPermission } from "../common/types";
import type { RequestUser } from "../common/types";

// Resolves the "tenant" clientId a request is scoped to (route param, query
// string, or JSON body - covers GET/DELETE, list filters, and POST/PATCH
// bodies respectively) so that client-scoped roles (e.g. a client-portal
// user, or an accountant assigned only to specific clients) are honoured in
// addition to firm-wide roles.
function resolveClientId(request: any): string | undefined {
  return request.params?.clientId ?? request.query?.clientId ?? request.body?.clientId;
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PermissionCode[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user: RequestUser | undefined = request.user;
    if (!user) throw new ForbiddenException("Not authenticated");

    const clientId = resolveClientId(request);
    const missing = required.filter((code) => !userHasPermission(user, code, clientId));
    if (missing.length > 0) {
      throw new ForbiddenException(`Missing required permission(s): ${missing.join(", ")}`);
    }
    return true;
  }
}

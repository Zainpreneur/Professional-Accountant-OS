import { SetMetadata } from "@nestjs/common";
import type { PermissionCode } from "./permissions";

export const PERMISSIONS_KEY = "requiredPermissions";

// Marks a route as requiring one or more permissions. Enforced by
// PermissionsGuard. When multiple codes are given, the user needs ALL of
// them (compose separate guards/decorators if you need OR semantics).
export const RequirePermissions = (...permissions: PermissionCode[]) => SetMetadata(PERMISSIONS_KEY, permissions);

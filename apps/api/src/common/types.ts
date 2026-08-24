import type { PermissionCode } from "../rbac/permissions";

// Attached to the request by JwtStrategy.validate() after loading the user
// and flattening their role assignments. `firmWidePermissions` come from
// UserRole rows with clientId = null; `clientPermissions` maps clientId ->
// the union of firm-wide permissions plus any roles scoped to that client.
export interface RequestUser {
  id: string;
  firmId: string;
  email: string;
  firstName: string;
  lastName: string;
  firmWidePermissions: PermissionCode[];
  clientPermissions: Record<string, PermissionCode[]>;
}

export function userHasPermission(user: RequestUser, permission: PermissionCode, clientId?: string): boolean {
  if (user.firmWidePermissions.includes(permission)) return true;
  if (clientId && user.clientPermissions[clientId]?.includes(permission)) return true;
  return false;
}

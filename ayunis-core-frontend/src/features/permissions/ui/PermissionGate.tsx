import type { ReactNode } from 'react';
import { useMyPermissions, type AppPermission } from '../api/useMyPermissions';

interface PermissionGateProps {
  /** Rendered only if the user holds (any of) these permissions. Admins hold all. */
  permission: AppPermission | AppPermission[];
  children: ReactNode;
  /** Shown instead when the user lacks the permission. Defaults to nothing. */
  fallback?: ReactNode;
}

/**
 * Hides a control from members who lack the required permission. While the
 * permission set is still loading it renders nothing, so a control the user may
 * not hold never flashes. The backend still enforces the permission — this is
 * purely UX so members don't see actions that would 403.
 */
export function PermissionGate({
  permission,
  children,
  fallback = null,
}: Readonly<PermissionGateProps>) {
  const { can, isLoading } = useMyPermissions();

  if (isLoading) {
    return null;
  }

  const required = Array.isArray(permission) ? permission : [permission];
  return required.some((p) => can(p)) ? <>{children}</> : <>{fallback}</>;
}

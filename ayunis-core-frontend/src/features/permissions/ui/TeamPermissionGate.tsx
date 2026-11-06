import type { ReactNode } from 'react';
import type { AppPermission } from '@/features/permissions/lib/authorization';
import { useAuthorization } from '@/features/permissions/api/useAuthorization';

interface TeamPermissionGateProps {
  teamId: string;
  /** Rendered only if the user holds (any of) these permissions in the team. */
  permission: AppPermission | AppPermission[];
  children: ReactNode;
}

/**
 * Like `PermissionGate`, but also counts what the user's role in the team
 * grants. Renders nothing while loading; the backend still enforces access.
 */
export function TeamPermissionGate({
  teamId,
  permission,
  children,
}: Readonly<TeamPermissionGateProps>) {
  const { canAnyInTeam, isLoading } = useAuthorization();

  if (isLoading) {
    return null;
  }

  const required = Array.isArray(permission) ? permission : [permission];
  return canAnyInTeam(teamId, ...required) ? <>{children}</> : null;
}

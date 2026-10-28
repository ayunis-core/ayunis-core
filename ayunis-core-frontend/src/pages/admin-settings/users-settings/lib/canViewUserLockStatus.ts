import {
  MeResponseDtoRole,
  MeResponseDtoSystemRole,
  type MeResponseDto,
} from '@/shared/api';

type AccountLockViewer = Pick<MeResponseDto, 'role' | 'systemRole'>;

export function canViewUserLockStatus(
  user: AccountLockViewer | null | undefined,
): boolean {
  return (
    user?.role === MeResponseDtoRole.admin ||
    user?.systemRole === MeResponseDtoSystemRole.super_admin
  );
}

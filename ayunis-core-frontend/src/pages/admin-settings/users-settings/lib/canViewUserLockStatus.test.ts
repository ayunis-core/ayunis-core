import { MeResponseDtoRole, MeResponseDtoSystemRole } from '@/shared/api';
import { describe, expect, it } from 'vitest';
import { canViewUserLockStatus } from './canViewUserLockStatus';

describe(canViewUserLockStatus.name, () => {
  it.each([
    {
      role: MeResponseDtoRole.admin,
      systemRole: MeResponseDtoSystemRole.customer,
      expected: true,
    },
    {
      role: MeResponseDtoRole.user,
      systemRole: MeResponseDtoSystemRole.super_admin,
      expected: true,
    },
    {
      role: MeResponseDtoRole.manager,
      systemRole: MeResponseDtoSystemRole.customer,
      expected: false,
    },
    {
      role: MeResponseDtoRole.user,
      systemRole: MeResponseDtoSystemRole.customer,
      expected: false,
    },
  ])(
    'returns $expected for role $role and system role $systemRole',
    ({ role, systemRole, expected }) => {
      expect(canViewUserLockStatus({ role, systemRole })).toBe(expected);
    },
  );
});

import type { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { SetMetadata } from '@nestjs/common';

export const SYSTEM_ROLES_KEY = 'systemRoles';

export const SystemRoles = (...roles: SystemRole[]) =>
  SetMetadata(SYSTEM_ROLES_KEY, roles);

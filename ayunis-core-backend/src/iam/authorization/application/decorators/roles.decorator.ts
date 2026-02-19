import { SetMetadata } from '@nestjs/common';
import type { UserRole as RolesEnum } from 'src/iam/users/domain/value-objects/role.object';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: RolesEnum[]) => SetMetadata(ROLES_KEY, roles);

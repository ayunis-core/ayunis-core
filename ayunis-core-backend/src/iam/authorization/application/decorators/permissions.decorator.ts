import { SetMetadata } from '@nestjs/common';
import type { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';

export const REQUIRE_PERMISSION_KEY = 'requiresPermission';

/**
 * Marks a route as requiring a specific permission. Admins always pass;
 * managers and users pass only when their org grants the permission to their
 * role. Access is denied (403) otherwise.
 *
 * @example
 * ```typescript
 * @RequirePermission(Permission.MANAGE_SKILLS)
 * @Post()
 * createSkill() {}
 * ```
 */
export const RequirePermission = (permission: Permission) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, permission);

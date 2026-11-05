import { SetMetadata } from '@nestjs/common';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';

export const REQUIRE_TEAM_PERMISSION_KEY = 'requiresTeamPermission';

// Reads are open to assigners too: assigning a user to a team is only
// reachable by first listing teams and their members.
export const TEAM_READ_PERMISSIONS = [
  Permission.MANAGE_TEAMS,
  Permission.ASSIGN_USERS_TO_TEAMS,
];

/**
 * Like `@RequirePermission`, but for routes acting on the team in the `:id`
 * path parameter: the permission may come from the caller's organisation role
 * or from their role in that team. Listing several permissions means *any* of
 * them grants access.
 */
export const RequireTeamPermission = (...permissions: Permission[]) =>
  SetMetadata(REQUIRE_TEAM_PERMISSION_KEY, permissions);

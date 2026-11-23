import type { UUID } from 'crypto';
import { Raw, type FindOperator } from 'typeorm';

/**
 * Matches the workspaces the user is a member of. Org admins are no
 * exception: without a membership row they match none.
 */
export function memberWorkspace(userId: UUID): FindOperator<UUID> {
  return Raw(
    (column) => `${column} IN (
      SELECT member."workspaceId" FROM workspace_members member
      WHERE member."userId" = :workspaceMemberId
    )`,
    { workspaceMemberId: userId },
  ) as FindOperator<UUID>;
}

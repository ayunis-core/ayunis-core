import type { UUID } from 'crypto';
import { Raw, type FindOperator, type FindOptionsWhere } from 'typeorm';
import type { ThreadRecord } from 'src/domain/threads/infrastructure/persistence/local/schema/thread.record';

/**
 * A chat filed in a workspace is reachable only while its creator is a member
 * of that workspace; personal chats have no workspace and are unaffected.
 * Callers also scope the chat by `userId`, so the user checked here is its
 * creator. The column is compared outside the subquery, so an unqualified
 * column name, as TypeORM renders it in UPDATE and DELETE, cannot bind to the
 * `workspace_members."workspaceId"` column instead.
 */
export function personalOrMemberWorkspaceSql(
  workspaceIdColumn: string,
  userIdParameter: string,
): string {
  return `(${workspaceIdColumn} IS NULL OR ${workspaceIdColumn} IN (
    SELECT member."workspaceId" FROM workspace_members member
    WHERE member."userId" = ${userIdParameter}
  ))`;
}

export function personalOrMemberWorkspace(userId: UUID): FindOperator<UUID> {
  return Raw(
    (column) => personalOrMemberWorkspaceSql(column, ':workspaceMemberId'),
    { workspaceMemberId: userId },
  ) as FindOperator<UUID>;
}

export function accessibleThread(
  id: UUID,
  userId: UUID,
): FindOptionsWhere<ThreadRecord> {
  return { id, userId, workspaceId: personalOrMemberWorkspace(userId) };
}

import type { UUID } from 'crypto';
import type { Repository } from 'typeorm';
import type { ThreadCitationContext } from 'src/domain/threads/application/models/thread-citation-context';
import type { ThreadRecord } from 'src/domain/threads/infrastructure/persistence/local/schema/thread.record';

export async function findThreadCitationContext(
  threadRepository: Repository<ThreadRecord>,
  id: UUID,
  userId: UUID,
): Promise<ThreadCitationContext | null> {
  const contexts = await threadRepository.query<ThreadCitationContext[]>(
    `SELECT
       thread."userId" AS "userId",
       thread."workspaceId" AS "workspaceId",
       COALESCE((
         SELECT jsonb_agg(jsonb_build_object(
           'sourceId', assignment."sourceId",
           'originSkillId', assignment."originSkillId"
         ))
         FROM thread_source_assignments assignment
         WHERE assignment."threadId" = thread.id
       ), '[]'::jsonb) AS "sourceAssignments",
       COALESCE((
         SELECT jsonb_agg(jsonb_build_object(
           'knowledgeBaseId', assignment."knowledgeBaseId",
           'originSkillId', assignment."originSkillId"
         ))
         FROM thread_knowledge_base_assignments assignment
         WHERE assignment."threadId" = thread.id
       ), '[]'::jsonb) AS "knowledgeBaseAssignments"
     FROM threads thread
     WHERE thread.id = $1 AND thread."userId" = $2`,
    [id, userId],
  );
  return contexts[0] ?? null;
}

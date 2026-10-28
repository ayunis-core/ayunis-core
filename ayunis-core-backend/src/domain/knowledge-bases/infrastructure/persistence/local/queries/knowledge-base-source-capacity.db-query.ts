import type { UUID } from 'crypto';
import { Not, type EntityManager } from 'typeorm';
import {
  KnowledgeBaseNotFoundError,
  KnowledgeBaseSourceLimitExceededError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBasesConstants } from 'src/domain/knowledge-bases/domain/knowledge-bases.constants';
import { SourceRecord } from 'src/domain/sources/infrastructure/persistence/local/schema/source.record';
import { KnowledgeBaseRecord } from 'src/domain/knowledge-bases/infrastructure/persistence/local/schema/knowledge-base.record';

export async function assignSourceWithinCapacity(
  manager: EntityManager,
  sourceId: UUID,
  knowledgeBaseId: UUID,
): Promise<void> {
  const knowledgeBase = await manager
    .getRepository(KnowledgeBaseRecord)
    .findOne({
      select: { id: true },
      where: { id: knowledgeBaseId },
      lock: { mode: 'pessimistic_write' },
    });
  if (!knowledgeBase) throw new KnowledgeBaseNotFoundError(knowledgeBaseId);
  const sources = manager.getRepository(SourceRecord);
  const count = await sources.count({
    where: { knowledgeBaseId, id: Not(sourceId) },
  });
  if (count >= KnowledgeBasesConstants.MAX_SOURCES)
    throw new KnowledgeBaseSourceLimitExceededError(
      KnowledgeBasesConstants.MAX_SOURCES,
    );
  await sources.update(sourceId, { knowledgeBaseId });
}

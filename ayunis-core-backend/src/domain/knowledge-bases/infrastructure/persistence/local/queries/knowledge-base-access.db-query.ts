import type { UUID } from 'crypto';
import type { SelectQueryBuilder } from 'typeorm';
import type { KnowledgeBaseRecord } from 'src/domain/knowledge-bases/infrastructure/persistence/local/schema/knowledge-base.record';
import { SourceRecord } from 'src/domain/sources/infrastructure/persistence/local/schema/source.record';

export function applyKnowledgeBaseTargetFilter(
  query: SelectQueryBuilder<KnowledgeBaseRecord>,
  target: { knowledgeBaseId?: UUID; sourceId?: UUID },
): void {
  if (target.knowledgeBaseId) {
    query.andWhere('knowledgeBase.id = :knowledgeBaseId', {
      knowledgeBaseId: target.knowledgeBaseId,
    });
  }
  if (target.sourceId) {
    query.innerJoin(
      SourceRecord,
      'activeSource',
      'activeSource.knowledgeBaseId = knowledgeBase.id AND activeSource.id = :sourceId',
      { sourceId: target.sourceId },
    );
  }
}

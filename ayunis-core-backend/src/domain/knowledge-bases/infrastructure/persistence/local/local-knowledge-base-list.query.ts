import type { UUID } from 'crypto';
import { Brackets, type Repository, type SelectQueryBuilder } from 'typeorm';
import type { KnowledgeBaseListOptions } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import type { KnowledgeBaseRecord } from './schema/knowledge-base.record';
import { usableCollectiveKnowledgeBases } from './local-collective-knowledge-base-scope.query';

interface AccessibleKnowledgeBasesFilter {
  userId: UUID;
  workspaceId: UUID | undefined;
  sharedKnowledgeBaseIds: UUID[];
  options: KnowledgeBaseListOptions;
}

function personalAccess(filter: AccessibleKnowledgeBasesFilter): Brackets {
  const { userId, sharedKnowledgeBaseIds, options } = filter;
  return new Brackets((accessQuery) => {
    accessQuery.where('knowledgeBase.userId = :userId', { userId });
    if (sharedKnowledgeBaseIds.length > 0) {
      accessQuery.orWhere('knowledgeBase.id IN (:...sharedKnowledgeBaseIds)', {
        sharedKnowledgeBaseIds,
      });
    }
    if (options.collective) {
      accessQuery.orWhere(usableCollectiveKnowledgeBases(options.collective));
    }
  });
}

export function buildAccessibleKnowledgeBasesQuery(
  repository: Repository<KnowledgeBaseRecord>,
  filter: AccessibleKnowledgeBasesFilter,
): SelectQueryBuilder<KnowledgeBaseRecord> {
  const queryBuilder = repository.createQueryBuilder('knowledgeBase');

  if (filter.workspaceId) {
    queryBuilder.where('knowledgeBase.workspaceId = :workspaceId', {
      workspaceId: filter.workspaceId,
    });
  } else {
    queryBuilder
      .where(personalAccess(filter))
      .andWhere('knowledgeBase.workspaceId IS NULL');
  }

  if (filter.options.search) {
    queryBuilder.andWhere('knowledgeBase.name ILIKE :search', {
      search: `%${filter.options.search}%`,
    });
  }

  return queryBuilder;
}

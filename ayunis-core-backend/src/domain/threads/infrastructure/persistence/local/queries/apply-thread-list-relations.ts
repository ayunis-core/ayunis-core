import type { SelectQueryBuilder } from 'typeorm';
import type { ThreadsFindAllOptions } from 'src/domain/threads/application/ports/threads.repository';
import type { ThreadRecord } from 'src/domain/threads/infrastructure/persistence/local/schema/thread.record';

export function applyThreadListRelations(
  queryBuilder: SelectQueryBuilder<ThreadRecord>,
  options?: ThreadsFindAllOptions,
): void {
  if (options?.withMessages) {
    queryBuilder.leftJoinAndSelect('thread.messages', 'messages');
  }
  if (options?.withSources) {
    queryBuilder.leftJoinAndSelect(
      'thread.sourceAssignments',
      'sourceAssignments',
    );
    queryBuilder.leftJoinAndSelect('sourceAssignments.source', 'source');
    queryBuilder.leftJoinAndSelect(
      'source.dataSourceDetails',
      'dataSourceDetails',
    );
  }
  if (options?.withKnowledgeBases) {
    queryBuilder.leftJoinAndSelect(
      'thread.knowledgeBaseAssignments',
      'knowledgeBaseAssignments',
    );
    queryBuilder.leftJoinAndSelect(
      'knowledgeBaseAssignments.knowledgeBase',
      'knowledgeBase',
    );
  }
  if (options?.withModel) {
    queryBuilder.leftJoinAndSelect('thread.model', 'model');
  }
}

import { getMetadataArgsStorage } from 'typeorm';
import { KnowledgeBaseRecord } from './knowledge-base.record';
import { SourceRecord } from 'src/domain/sources/infrastructure/persistence/local/schema/source.record';
import { ParentChunkRecord } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/infrastructure/persistence/schema/parent-chunk.record';
import { ChildChunkRecord } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/infrastructure/persistence/schema/child-chunk.record';

describe('workspace knowledge-base deletion cascades', () => {
  it.each([
    { target: KnowledgeBaseRecord, property: 'workspace' },
    { target: SourceRecord, property: 'knowledgeBase' },
    { target: ParentChunkRecord, property: 'source' },
    { target: ChildChunkRecord, property: 'parent' },
  ])(
    'cascades deletion through $target.name.$property',
    ({ target, property }) => {
      const relation = getMetadataArgsStorage().relations.find(
        (entry) => entry.target === target && entry.propertyName === property,
      );
      expect(relation).toBeDefined();
      expect(relation?.options.onDelete).toBe('CASCADE');
    },
  );
});

import { randomUUID } from 'crypto';
import { ChildChunk } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/domain/child-chunk.entity';
import { ParentChildIndexerMapper } from './parent-child-indexer.mapper';

describe('ParentChildIndexerMapper', () => {
  const mapper = new ParentChildIndexerMapper();

  it.each([1024, 1536, 2560])(
    'reads back a %i-dimensional child embedding from its dimension column',
    (dimensions) => {
      const embedding = Array.from({ length: dimensions }, (_, i) => i / 1000);
      const record = mapper.toChildChunkRecord(
        new ChildChunk({ parentId: randomUUID(), embedding }),
        randomUUID(),
      );

      expect(mapper.toChildChunkEntity(record).embedding).toEqual(embedding);
    },
  );
});

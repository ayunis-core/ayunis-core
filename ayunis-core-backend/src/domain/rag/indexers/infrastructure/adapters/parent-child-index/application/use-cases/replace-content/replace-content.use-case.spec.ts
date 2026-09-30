jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: object, _propertyKey: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import type { UUID } from 'crypto';
import { ReplaceContentUseCase } from './replace-content.use-case';
import type { ParentChildIndexerRepositoryPort } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/application/ports/parent-child-indexer-repository.port';
import { ParentChunk } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/domain/parent-chunk.entity';
import { ChildChunk } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/domain/child-chunk.entity';
import { PreparedParentChildContent } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/domain/prepared-parent-child-content.entity';

const DOC_ID = '22222222-2222-2222-2222-222222222222' as UUID;
const CHUNK_ID = '33333333-3333-3333-3333-333333333333' as UUID;

describe('ReplaceContentUseCase', () => {
  let writes: string[];
  let repository: jest.Mocked<ParentChildIndexerRepositoryPort>;
  let useCase: ReplaceContentUseCase;

  beforeEach(() => {
    writes = [];
    repository = {
      save: jest.fn(),
      saveMany: jest.fn(async (chunks: ParentChunk[]) => {
        writes.push(`insert ${chunks.length}`);
      }),
      delete: jest.fn(async (documentId: UUID) => {
        writes.push(`delete ${documentId}`);
      }),
      deleteMany: jest.fn(),
      find: jest.fn(),
      findByDocumentIds: jest.fn(),
    };
    useCase = new ReplaceContentUseCase(repository);
  });

  it('deletes the document entries before inserting the prepared ones', async () => {
    const parent = new ParentChunk({
      relatedDocumentId: DOC_ID,
      relatedChunkId: CHUNK_ID,
      content: 'Satzung über die Erhebung von Gebühren',
      children: [],
    });
    parent.children.push(
      new ChildChunk({ embedding: [0.1, 0.2], parentId: parent.id }),
    );

    await useCase.execute(new PreparedParentChildContent(DOC_ID, [parent]));

    expect(writes).toEqual([`delete ${DOC_ID}`, 'insert 1']);
    expect(repository.saveMany).toHaveBeenCalledWith([parent]);
  });

  it('removes the previous entries when the new content is empty', async () => {
    await useCase.execute(new PreparedParentChildContent(DOC_ID, []));

    expect(writes).toEqual([`delete ${DOC_ID}`, 'insert 0']);
  });
});

jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: object, _propertyKey: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import { randomUUID } from 'crypto';
import type { PrepareBulkContentUseCase } from 'src/domain/rag/indexers/application/use-cases/prepare-bulk-content/prepare-bulk-content.use-case';
import type { PrepareBulkContentCommand } from 'src/domain/rag/indexers/application/use-cases/prepare-bulk-content/prepare-bulk-content.command';
import type { ReplaceBulkContentUseCase } from 'src/domain/rag/indexers/application/use-cases/replace-bulk-content/replace-bulk-content.use-case';
import type { ReplaceBulkContentCommand } from 'src/domain/rag/indexers/application/use-cases/replace-bulk-content/replace-bulk-content.command';
import { IndexType } from 'src/domain/rag/indexers/domain/value-objects/index-type.enum';
import { PreparedParentChildContent } from 'src/domain/rag/indexers/infrastructure/adapters/parent-child-index/domain/prepared-parent-child-content.entity';
import { createMockSourceRepository } from 'src/domain/sources/application/testing/source.fixtures';
import { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import { UrlSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { TextType } from 'src/domain/sources/domain/source-type.enum';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { SourceContentReplacementService } from './source-content-replacement.service';

const ORG_ID = randomUUID();

function makeSource(): UrlSource {
  return new UrlSource({
    name: 'Abfallkalender',
    type: TextType.WEB,
    url: 'https://www.stadt.example/abfall',
    status: SourceStatus.PROCESSING,
  });
}

describe('SourceContentReplacementService', () => {
  let writes: string[];
  let sourceRepository: ReturnType<typeof createMockSourceRepository>;
  let prepareBulkContentUseCase: {
    execute: jest.Mock<
      Promise<PreparedParentChildContent>,
      [PrepareBulkContentCommand]
    >;
  };
  let replaceBulkContentUseCase: {
    execute: jest.Mock<Promise<void>, [ReplaceBulkContentCommand]>;
  };
  let service: SourceContentReplacementService;

  beforeEach(() => {
    writes = [];
    sourceRepository = createMockSourceRepository();
    sourceRepository.replaceTextSource.mockImplementation(async (source) => {
      writes.push('source content');
      return source;
    });
    prepareBulkContentUseCase = {
      execute: jest.fn(
        async (command: PrepareBulkContentCommand) =>
          new PreparedParentChildContent(command.documentId, []),
      ),
    };
    replaceBulkContentUseCase = {
      execute: jest.fn<Promise<void>, [ReplaceBulkContentCommand]>(async () => {
        writes.push('index');
      }),
    };
    service = new SourceContentReplacementService(
      sourceRepository,
      prepareBulkContentUseCase as unknown as PrepareBulkContentUseCase,
      replaceBulkContentUseCase as unknown as ReplaceBulkContentUseCase,
    );
  });

  it('prepares the parent-child index for every chunk without writing anything', async () => {
    const source = makeSource();
    const chunks = [
      new TextSourceContentChunk({ content: 'Restmüll: dienstags', meta: {} }),
      new TextSourceContentChunk({ content: 'Biotonne: freitags', meta: {} }),
    ];

    const prepared = await service.prepare({
      sourceId: source.id,
      orgId: ORG_ID,
      text: 'Restmüll: dienstags\nBiotonne: freitags',
      chunks,
    });

    const [command] = prepareBulkContentUseCase.execute.mock.calls[0];
    expect(command).toMatchObject({
      orgId: ORG_ID,
      documentId: source.id,
      type: IndexType.PARENT_CHILD,
      entries: chunks.map((chunk) => ({
        chunkId: chunk.id,
        content: chunk.content,
      })),
    });
    expect(prepared.chunks).toBe(chunks);
    expect(prepared.index.documentId).toBe(source.id);
    expect(writes).toEqual([]);
  });

  it('writes the source content before swapping in the prepared index', async () => {
    const source = makeSource();
    const chunks = [
      new TextSourceContentChunk({ content: 'Restmüll: dienstags', meta: {} }),
    ];
    const prepared = await service.prepare({
      sourceId: source.id,
      orgId: ORG_ID,
      text: 'Restmüll: dienstags',
      chunks,
    });

    await expect(service.commit(source, prepared)).resolves.toBe(source);

    expect(writes).toEqual(['source content', 'index']);
    expect(sourceRepository.replaceTextSource).toHaveBeenCalledWith(source, {
      text: 'Restmüll: dienstags',
      chunks,
    });
    const [command] = replaceBulkContentUseCase.execute.mock.calls[0];
    expect(command.prepared).toBe(prepared.index);
  });

  it('skips the index swap when the source no longer exists', async () => {
    const source = makeSource();
    sourceRepository.replaceTextSource.mockResolvedValueOnce(null);
    const prepared = await service.prepare({
      sourceId: source.id,
      orgId: ORG_ID,
      text: 'Restmüll: dienstags',
      chunks: [],
    });

    await expect(service.commit(source, prepared)).resolves.toBeNull();

    expect(replaceBulkContentUseCase.execute).not.toHaveBeenCalled();
  });

  it('refuses content prepared for another source before writing', async () => {
    const prepared = await service.prepare({
      sourceId: randomUUID(),
      orgId: ORG_ID,
      text: 'Restmüll: dienstags',
      chunks: [],
    });

    await expect(service.commit(makeSource(), prepared)).rejects.toThrow(
      'was prepared for source',
    );
    expect(writes).toEqual([]);
  });
});

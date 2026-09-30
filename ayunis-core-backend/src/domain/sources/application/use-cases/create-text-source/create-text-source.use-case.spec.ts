jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: object, _propertyKey: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import type { RetrieveUrlUseCase } from 'src/domain/retrievers/url-retrievers/application/use-cases/retrieve-url/retrieve-url.use-case';
import type { RetrieveFileContentUseCase } from 'src/domain/retrievers/file-retrievers/application/use-cases/retrieve-file-content/retrieve-file-content.use-case';
import type { SplitTextUseCase } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.use-case';
import type { SplitTextCommand } from 'src/domain/rag/splitters/application/use-cases/split-text/split-text.command';
import {
  SplitResult,
  TextChunk,
} from 'src/domain/rag/splitters/domain/split-result.entity';
import { UrlRetrieverResult } from 'src/domain/retrievers/url-retrievers/domain/url-retriever-result.entity';
import type { SourceContentReplacementService } from 'src/domain/sources/application/services/source-content-replacement.service';
import type { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import { UrlSource } from 'src/domain/sources/domain/sources/text-source.entity';
import type { TextSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { createMockSourceRepository } from 'src/domain/sources/application/testing/source.fixtures';
import { CreateTextSourceUseCase } from './create-text-source.use-case';
import { CreateUrlSourceCommand } from './create-text-source.command';

const ORG_ID = randomUUID();

describe('CreateTextSourceUseCase', () => {
  const sourceRepository = createMockSourceRepository();
  const contentReplacement = {
    prepare: jest.fn(
      async (params: {
        sourceId: UUID;
        text: string;
        chunks: TextSourceContentChunk[];
      }) => ({
        text: params.text,
        chunks: params.chunks,
        index: { documentId: params.sourceId },
      }),
    ),
    commit: jest.fn(async (source: TextSource) => source),
  };
  const useCase = new CreateTextSourceUseCase(
    {
      execute: jest.fn(
        async () =>
          new UrlRetrieverResult(
            'Öffnungszeiten Bürgerbüro: Mo–Fr 8–12 Uhr',
            'https://www.stadt.example/buergerbuero',
            'Bürgerbüro',
          ),
      ),
    } as unknown as RetrieveUrlUseCase,
    { get: jest.fn(() => ORG_ID) } as unknown as ContextService,
    {} as RetrieveFileContentUseCase,
    {
      execute: (command: SplitTextCommand) =>
        new SplitResult([new TextChunk(command.text)]),
    } as unknown as SplitTextUseCase,
    sourceRepository,
    contentReplacement as unknown as SourceContentReplacementService,
  );

  it('prepares the index, then creates the source row and commits its content onto it', async () => {
    const created = await useCase.execute(
      new CreateUrlSourceCommand({
        url: 'https://www.stadt.example/buergerbuero',
      }),
    );

    expect(created).toBeInstanceOf(UrlSource);
    const [prepareParams] = contentReplacement.prepare.mock.calls[0];
    expect(prepareParams).toMatchObject({
      sourceId: created.id,
      orgId: ORG_ID,
      text: 'Öffnungszeiten Bürgerbüro: Mo–Fr 8–12 Uhr',
    });
    const prepared = await contentReplacement.prepare.mock.results[0].value;
    expect(contentReplacement.commit).toHaveBeenCalledWith(created, prepared);
    expect(sourceRepository.save).toHaveBeenCalledWith(created);
    expect(sourceRepository.save.mock.invocationCallOrder[0]).toBeLessThan(
      contentReplacement.commit.mock.invocationCallOrder[0],
    );
  });

  it('stamps when the synchronously created content went live', async () => {
    const createdAfter = new Date();

    const created = await useCase.execute(
      new CreateUrlSourceCommand({
        url: 'https://www.stadt.example/buergerbuero',
      }),
    );

    expect(created.lastIndexedAt!.getTime()).toBeGreaterThanOrEqual(
      createdAfter.getTime(),
    );
  });
});

import type { UUID } from 'crypto';
import { ProviderTimeoutError } from 'src/common/errors/provider.errors';
import {
  FileTooLargeError,
  UnprocessableDocumentError,
} from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';
import type { DeleteContentCommand } from 'src/domain/rag/indexers/application/use-cases/delete-content/delete-content.command';
import type { PreparedTextSourceContent } from 'src/domain/sources/application/models/prepared-text-source-content';
import { SourceIngestionKind } from 'src/domain/sources/application/models/source-ingestion-kind.enum';
import { createMockSourceRepository } from 'src/domain/sources/application/testing/source.fixtures';
import type { MarkSourceFailedCommand } from 'src/domain/sources/application/use-cases/mark-source-failed/mark-source-failed.command';
import { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import { SourceProcessingErrorCode } from 'src/domain/sources/domain/source-processing-error-code.enum';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { TextType } from 'src/domain/sources/domain/source-type.enum';
import { CSVDataSource } from 'src/domain/sources/domain/sources/data-source.entity';
import {
  type TextSource,
  UrlSource,
} from 'src/domain/sources/domain/sources/text-source.entity';
import { SourceProcessingHelper } from './source-processing-helper.service';
import { SourceContentDegradationGuard } from './source-content-degradation-guard.service';
import {
  type IngestionFailureOutcome,
  SourceIngestionService,
} from './source-ingestion.service';
import {
  type ExtractedTextSourceContent,
  TextSourceExtractor,
} from './text-source-extractor';

const SOURCE_ID = '00000000-0000-0000-0000-000000000001' as UUID;
const ORG_ID = '00000000-0000-0000-0000-000000000010' as UUID;
const KNOWLEDGE_BASE_ID = '00000000-0000-0000-0000-000000000030' as UUID;

interface WasteCalendarInput {
  url: string;
}

class FakeExtractor extends TextSourceExtractor<WasteCalendarInput> {
  readonly extract = jest.fn<
    Promise<ExtractedTextSourceContent>,
    [WasteCalendarInput]
  >(async () => ({
    text: 'Restmüll: dienstags',
    chunks: [
      new TextSourceContentChunk({ content: 'Restmüll: dienstags', meta: {} }),
    ],
  }));
  override readonly release = jest.fn<Promise<void>, [WasteCalendarInput]>(
    async () => {},
  );
}

const INPUT: WasteCalendarInput = { url: 'https://www.stadt.example/abfall' };

function makeSource(status = SourceStatus.PROCESSING): UrlSource {
  return new UrlSource({
    id: SOURCE_ID,
    name: 'www.stadt.example',
    type: TextType.WEB,
    url: INPUT.url,
    knowledgeBaseId: null,
    status,
    processingStartedAt: new Date(),
  });
}

const retryScheduled = new Error('retry scheduled');
const retryable = (): IngestionFailureOutcome => ({
  final: false,
  rethrow: retryScheduled,
});
const finalRethrowingOriginal = (error: unknown): IngestionFailureOutcome => ({
  final: true,
  rethrow: error as Error,
});
const finalExpected = (): IngestionFailureOutcome => ({
  final: true,
  rethrow: null,
});

describe('SourceIngestionService', () => {
  let sourceRepository: ReturnType<typeof createMockSourceRepository>;
  let contentReplacement: {
    prepare: jest.Mock<
      Promise<PreparedTextSourceContent>,
      [
        {
          sourceId: UUID;
          orgId: UUID;
          text: string;
          chunks: TextSourceContentChunk[];
        },
      ]
    >;
    commit: jest.Mock<
      Promise<TextSource | null>,
      [TextSource, PreparedTextSourceContent]
    >;
  };
  let markSourceFailedUseCase: {
    execute: jest.Mock<Promise<void>, [MarkSourceFailedCommand]>;
  };
  let deleteContentUseCase: {
    execute: jest.Mock<Promise<void>, [DeleteContentCommand]>;
  };
  let extractor: FakeExtractor;
  let service: SourceIngestionService;

  function ingest(
    classifyFailure: (error: unknown) => IngestionFailureOutcome = retryable,
    kind = SourceIngestionKind.INITIAL,
  ): Promise<void> {
    return service.ingest({
      sourceId: SOURCE_ID,
      orgId: ORG_ID,
      kind,
      extractor,
      input: INPUT,
      classifyFailure,
    });
  }

  function reindex(
    classifyFailure: (error: unknown) => IngestionFailureOutcome = retryable,
  ): Promise<void> {
    return ingest(classifyFailure, SourceIngestionKind.REINDEX);
  }

  beforeEach(() => {
    sourceRepository = createMockSourceRepository();
    sourceRepository.findById.mockResolvedValue(makeSource());
    contentReplacement = {
      prepare: jest.fn(async (params) => ({
        text: params.text,
        chunks: params.chunks,
        index: { documentId: params.sourceId } as never,
      })),
      commit: jest.fn<
        Promise<TextSource | null>,
        [TextSource, PreparedTextSourceContent]
      >(async (source) => source),
    };
    markSourceFailedUseCase = {
      execute: jest.fn<Promise<void>, [MarkSourceFailedCommand]>(
        async () => {},
      ),
    };
    deleteContentUseCase = {
      execute: jest.fn<Promise<void>, [DeleteContentCommand]>(async () => {}),
    };
    extractor = new FakeExtractor();
    service = new SourceIngestionService(
      sourceRepository,
      contentReplacement as never,
      new SourceProcessingHelper(
        deleteContentUseCase as never,
        markSourceFailedUseCase as never,
      ),
      new SourceContentDegradationGuard(sourceRepository),
    );
  });

  describe('successful run', () => {
    it('indexes the extracted content and marks the source ready', async () => {
      await ingest();

      expect(contentReplacement.prepare).toHaveBeenCalledWith({
        sourceId: SOURCE_ID,
        orgId: ORG_ID,
        text: 'Restmüll: dienstags',
        chunks: [expect.objectContaining({ content: 'Restmüll: dienstags' })],
      });
      const prepared = await contentReplacement.prepare.mock.results[0].value;
      expect(contentReplacement.commit).toHaveBeenCalledWith(
        expect.objectContaining({ id: SOURCE_ID }),
        prepared,
      );
      expect(sourceRepository.updateStatusConditionally).toHaveBeenCalledWith(
        SOURCE_ID,
        SourceStatus.PROCESSING,
        SourceStatus.READY,
        { processingError: null, lastIndexedAt: expect.any(Date) },
      );
    });

    it('releases the extractor input once the source is ready', async () => {
      await ingest();

      expect(extractor.release).toHaveBeenCalledWith(INPUT);
    });

    it('refreshes the heartbeat with a targeted update instead of saving the loaded record', async () => {
      await ingest();

      expect(sourceRepository.refreshProcessingHeartbeat).toHaveBeenCalledWith(
        SOURCE_ID,
      );
      expect(sourceRepository.save).not.toHaveBeenCalled();
    });

    it('renames the source when the extractor supplies a name', async () => {
      extractor.extract.mockResolvedValueOnce({
        text: 'Abfuhrtermine',
        chunks: [],
        name: 'Abfallkalender – Stadt Beispiel',
      });

      await ingest();

      const [committed] = contentReplacement.commit.mock.calls[0];
      expect(committed.name).toBe('Abfallkalender – Stadt Beispiel');
    });

    it('keeps the source name when the extractor supplies none', async () => {
      await ingest();

      const [committed] = contentReplacement.commit.mock.calls[0];
      expect(committed.name).toBe('www.stadt.example');
    });

    it('writes content against the freshly loaded source so a knowledge base assigned after the claim is kept', async () => {
      const assigned = makeSource();
      assigned.knowledgeBaseId = KNOWLEDGE_BASE_ID;
      // Add*ToKnowledgeBase use cases assign the knowledge base right after
      // enqueueing, so the claim's read may predate it.
      sourceRepository.findById
        .mockResolvedValueOnce(makeSource())
        .mockResolvedValueOnce(assigned);

      await ingest();

      const [committed] = contentReplacement.commit.mock.calls[0];
      expect(committed.knowledgeBaseId).toBe(KNOWLEDGE_BASE_ID);
    });

    it('embeds before re-reading the source, so the commit uses a copy read right before it', async () => {
      await ingest();

      const reloadOrder = sourceRepository.findById.mock.invocationCallOrder[1];
      expect(
        contentReplacement.prepare.mock.invocationCallOrder[0],
      ).toBeLessThan(reloadOrder);
      expect(
        contentReplacement.commit.mock.invocationCallOrder[0],
      ).toBeGreaterThan(reloadOrder);
    });
  });

  it('never compares a first run with previous content', async () => {
    sourceRepository.countIndexedPages.mockResolvedValue(12);

    await ingest();

    expect(sourceRepository.countIndexedPages).not.toHaveBeenCalled();
    expect(contentReplacement.commit).toHaveBeenCalled();
  });

  describe('skipped run', () => {
    it.each([
      ['is missing', null],
      ['is no longer processing', makeSource(SourceStatus.FAILED)],
    ])(
      'skips extraction and releases the input when the source %s',
      async (_case, found) => {
        sourceRepository.findById.mockResolvedValue(found);

        await ingest();

        expect(extractor.extract).not.toHaveBeenCalled();
        expect(contentReplacement.commit).not.toHaveBeenCalled();
        expect(extractor.release).toHaveBeenCalledWith(INPUT);
      },
    );

    it('skips extraction when the heartbeat finds the source gone or no longer processing', async () => {
      sourceRepository.refreshProcessingHeartbeat.mockResolvedValue(false);

      await ingest();

      expect(extractor.extract).not.toHaveBeenCalled();
      expect(contentReplacement.commit).not.toHaveBeenCalled();
      expect(extractor.release).toHaveBeenCalledWith(INPUT);
    });

    it.each([
      ['is deleted', null],
      ['changes status', makeSource(SourceStatus.FAILED)],
    ])(
      'writes nothing and releases the input when the source %s mid-run',
      async (_case, reloaded) => {
        sourceRepository.findById
          .mockResolvedValueOnce(makeSource())
          .mockResolvedValueOnce(reloaded);

        await ingest();

        expect(contentReplacement.commit).not.toHaveBeenCalled();
        expect(
          sourceRepository.updateStatusConditionally,
        ).not.toHaveBeenCalled();
        expect(extractor.release).toHaveBeenCalledWith(INPUT);
      },
    );

    it('does not mark the source ready or failed when it is deleted before the commit', async () => {
      contentReplacement.commit.mockResolvedValueOnce(null);

      await ingest();

      expect(sourceRepository.updateStatusConditionally).not.toHaveBeenCalled();
      expect(markSourceFailedUseCase.execute).not.toHaveBeenCalled();
      expect(extractor.release).toHaveBeenCalledWith(INPUT);
    });

    it('removes the committed index entries when the source can no longer be marked ready', async () => {
      sourceRepository.updateStatusConditionally.mockResolvedValue(false);

      await ingest();

      expect(contentReplacement.commit).toHaveBeenCalled();
      expect(deleteContentUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ documentId: SOURCE_ID }),
      );
      expect(extractor.release).toHaveBeenCalledWith(INPUT);
    });
  });

  describe('failed attempt', () => {
    it('rethrows the classified error and keeps the input when a retry follows', async () => {
      extractor.extract.mockRejectedValueOnce(new Error('MinIO unreachable'));

      await expect(ingest(retryable)).rejects.toBe(retryScheduled);

      expect(markSourceFailedUseCase.execute).not.toHaveBeenCalled();
      expect(deleteContentUseCase.execute).not.toHaveBeenCalled();
      expect(extractor.release).not.toHaveBeenCalled();
    });

    it('marks the source failed, cleans up the index and releases the input on the final attempt', async () => {
      const failure = new Error('root unreachable');
      extractor.extract.mockRejectedValueOnce(failure);

      await expect(ingest(finalRethrowingOriginal)).rejects.toBe(failure);

      expect(markSourceFailedUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceId: SOURCE_ID,
          errorMessage: 'root unreachable',
          errorCode: SourceProcessingErrorCode.PROCESSING_FAILED,
        }),
      );
      expect(deleteContentUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ documentId: SOURCE_ID }),
      );
      expect(extractor.release).toHaveBeenCalledWith(INPUT);
    });

    it('completes without throwing when the failure is settled as expected', async () => {
      extractor.extract.mockRejectedValueOnce(new FileTooLargeError());

      await expect(ingest(finalExpected)).resolves.toBeUndefined();

      expect(markSourceFailedUseCase.execute).toHaveBeenCalled();
      expect(extractor.release).toHaveBeenCalledWith(INPUT);
    });

    it.each([
      [
        'an OCR-unreadable document',
        new UnprocessableDocumentError('OCR rejected the document'),
        SourceProcessingErrorCode.DOCUMENT_UNREADABLE,
      ],
      [
        'a provider timeout',
        new ProviderTimeoutError({ provider: 'mistral' }),
        SourceProcessingErrorCode.PROCESSING_TIMEOUT,
      ],
    ])('records the error code of %s', async (_case, failure, expectedCode) => {
      extractor.extract.mockRejectedValueOnce(failure);

      await ingest(finalExpected);

      expect(markSourceFailedUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ errorCode: expectedCode }),
      );
    });

    it('passes the thrown error to the classifier', async () => {
      const failure = new Error('crawl aborted');
      extractor.extract.mockRejectedValueOnce(failure);
      const classifyFailure = jest.fn(finalExpected);

      await ingest(classifyFailure);

      expect(classifyFailure).toHaveBeenCalledWith(failure);
    });

    it('marks the source failed without committing when embedding fails on the final attempt', async () => {
      contentReplacement.prepare.mockRejectedValueOnce(
        new Error('embedding provider unavailable'),
      );

      await expect(ingest(finalRethrowingOriginal)).rejects.toThrow(
        'embedding provider unavailable',
      );

      expect(contentReplacement.commit).not.toHaveBeenCalled();
      expect(markSourceFailedUseCase.execute).toHaveBeenCalled();
    });

    it('fails the run when the claimed source is not a text source', async () => {
      sourceRepository.findById.mockResolvedValue(
        new CSVDataSource({
          id: SOURCE_ID,
          name: 'haushalt.csv',
          data: { headers: [], rows: [] },
          status: SourceStatus.PROCESSING,
        }),
      );

      await expect(ingest(finalRethrowingOriginal)).rejects.toThrow(
        `Source ${SOURCE_ID} is not a TextSource`,
      );

      expect(extractor.extract).not.toHaveBeenCalled();
      expect(markSourceFailedUseCase.execute).toHaveBeenCalled();
    });
  });

  describe('re-run of a ready source', () => {
    const PREVIOUS_FAILURE = {
      lastIndexedAt: new Date('2026-09-01T06:00:00.000Z'),
      lastRunFailedAt: new Date('2026-09-15T06:00:00.000Z'),
      lastRunError: 'getaddrinfo ENOTFOUND www.stadt.example',
      lastRunErrorCode: SourceProcessingErrorCode.PROCESSING_FAILED,
    };

    function readySource(): UrlSource {
      const source = makeSource(SourceStatus.READY);
      Object.assign(source, { processingStartedAt: null }, PREVIOUS_FAILURE);
      return source;
    }

    beforeEach(() => {
      sourceRepository.findById.mockImplementation(async () => readySource());
    });

    it('commits the new content onto the still-ready source, stamping lastIndexedAt and clearing the previous failure', async () => {
      const startedAt = new Date();

      await reindex();

      const [committed] = contentReplacement.commit.mock.calls[0];
      expect(committed.status).toBe(SourceStatus.READY);
      expect(committed.lastIndexedAt!.getTime()).toBeGreaterThanOrEqual(
        startedAt.getTime(),
      );
      expect(committed).toMatchObject({
        lastRunFailedAt: null,
        lastRunError: null,
        lastRunErrorCode: null,
      });
    });

    it('never moves the source to PROCESSING, so the stale-processing cleanup cannot see it', async () => {
      await reindex();

      expect(
        sourceRepository.refreshProcessingHeartbeat,
      ).not.toHaveBeenCalled();
      expect(sourceRepository.updateStatusConditionally).not.toHaveBeenCalled();
      expect(sourceRepository.save).not.toHaveBeenCalled();
      expect(extractor.release).toHaveBeenCalledWith(INPUT);
    });

    it.each([
      ['is missing', null],
      [
        'is still processing its first run',
        makeSource(SourceStatus.PROCESSING),
      ],
      ['has failed its first run', makeSource(SourceStatus.FAILED)],
    ])(
      'skips without extracting or writing when the source %s',
      async (_case, found) => {
        sourceRepository.findById.mockResolvedValue(found);

        await reindex();

        expect(extractor.extract).not.toHaveBeenCalled();
        expect(contentReplacement.commit).not.toHaveBeenCalled();
        expect(sourceRepository.recordRunFailure).not.toHaveBeenCalled();
        expect(extractor.release).toHaveBeenCalledWith(INPUT);
      },
    );

    it.each([
      ['is deleted', null],
      ['is no longer ready', makeSource(SourceStatus.FAILED)],
    ])(
      'writes nothing when the source %s before the commit re-read',
      async (_case, reloaded) => {
        sourceRepository.findById
          .mockResolvedValueOnce(readySource())
          .mockResolvedValueOnce(reloaded);

        await reindex();

        expect(contentReplacement.commit).not.toHaveBeenCalled();
        expect(sourceRepository.recordRunFailure).not.toHaveBeenCalled();
        expect(
          sourceRepository.updateStatusConditionally,
        ).not.toHaveBeenCalled();
        expect(extractor.release).toHaveBeenCalledWith(INPUT);
      },
    );

    it('writes nothing else when the source is deleted before the commit takes its lock', async () => {
      contentReplacement.commit.mockResolvedValueOnce(null);

      await reindex();

      expect(sourceRepository.recordRunFailure).not.toHaveBeenCalled();
      expect(sourceRepository.updateStatusConditionally).not.toHaveBeenCalled();
      expect(deleteContentUseCase.execute).not.toHaveBeenCalled();
    });

    it('records nothing and keeps the input when a retry follows', async () => {
      extractor.extract.mockRejectedValueOnce(new Error('fetch failed'));

      await expect(reindex(retryable)).rejects.toBe(retryScheduled);

      expect(sourceRepository.recordRunFailure).not.toHaveBeenCalled();
      expect(markSourceFailedUseCase.execute).not.toHaveBeenCalled();
      expect(deleteContentUseCase.execute).not.toHaveBeenCalled();
      expect(extractor.release).not.toHaveBeenCalled();
    });

    it('records the failed run on the final attempt and leaves status and index alone', async () => {
      const failure = new Error('getaddrinfo ENOTFOUND www.stadt.example');
      extractor.extract.mockRejectedValueOnce(failure);
      const startedAt = new Date();

      await expect(reindex(finalRethrowingOriginal)).rejects.toBe(failure);

      expect(sourceRepository.recordRunFailure).toHaveBeenCalledWith(
        SOURCE_ID,
        {
          failedAt: expect.any(Date),
          error: 'getaddrinfo ENOTFOUND www.stadt.example',
          errorCode: SourceProcessingErrorCode.PROCESSING_FAILED,
        },
      );
      const [, { failedAt }] = sourceRepository.recordRunFailure.mock.calls[0];
      expect(failedAt.getTime()).toBeGreaterThanOrEqual(startedAt.getTime());
      expect(markSourceFailedUseCase.execute).not.toHaveBeenCalled();
      expect(sourceRepository.updateStatusConditionally).not.toHaveBeenCalled();
      expect(deleteContentUseCase.execute).not.toHaveBeenCalled();
      expect(contentReplacement.commit).not.toHaveBeenCalled();
      expect(extractor.release).toHaveBeenCalledWith(INPUT);
    });

    it('classifies the failed run with the same codes as a failed first run', async () => {
      extractor.extract.mockRejectedValueOnce(
        new ProviderTimeoutError({ provider: 'mistral' }),
      );

      await reindex(finalExpected);

      expect(sourceRepository.recordRunFailure).toHaveBeenCalledWith(
        SOURCE_ID,
        expect.objectContaining({
          errorCode: SourceProcessingErrorCode.PROCESSING_TIMEOUT,
        }),
      );
    });

    it('fails a re-index that finds far fewer pages than the content it would replace, before embedding it', async () => {
      sourceRepository.countIndexedPages.mockResolvedValue(12);

      await reindex(finalExpected);

      expect(sourceRepository.countIndexedPages).toHaveBeenCalledWith(
        SOURCE_ID,
      );
      expect(contentReplacement.prepare).not.toHaveBeenCalled();
      expect(contentReplacement.commit).not.toHaveBeenCalled();
      expect(sourceRepository.recordRunFailure).toHaveBeenCalledWith(
        SOURCE_ID,
        expect.objectContaining({
          errorCode: SourceProcessingErrorCode.CONTENT_DEGRADED,
        }),
      );
    });

    it('still ends the run with the classified outcome when recording the failure fails', async () => {
      const failure = new Error('getaddrinfo ENOTFOUND www.stadt.example');
      extractor.extract.mockRejectedValueOnce(failure);
      sourceRepository.recordRunFailure.mockRejectedValueOnce(
        new Error('connection terminated'),
      );

      await expect(reindex(finalRethrowingOriginal)).rejects.toBe(failure);

      expect(extractor.release).toHaveBeenCalledWith(INPUT);
    });
  });
});

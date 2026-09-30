import type { UUID } from 'crypto';
import { ProviderTimeoutError } from 'src/common/errors/provider.errors';
import {
  FileTooLargeError,
  UnprocessableDocumentError,
} from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';
import type { DeleteContentCommand } from 'src/domain/rag/indexers/application/use-cases/delete-content/delete-content.command';
import type { PreparedTextSourceContent } from 'src/domain/sources/application/models/prepared-text-source-content';
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
  ): Promise<void> {
    return service.ingest({
      sourceId: SOURCE_ID,
      orgId: ORG_ID,
      extractor,
      input: INPUT,
      classifyFailure,
    });
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
        { processingError: null },
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
});

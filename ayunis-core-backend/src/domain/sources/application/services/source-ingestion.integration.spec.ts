import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import { SourceRecord } from 'src/domain/sources/infrastructure/persistence/local/schema/source.record';
import {
  createSourcePostgresHarness,
  type SourcePostgresHarness,
} from 'src/domain/sources/application/testing/source-postgres.harness';
import { SourceIngestionKind } from 'src/domain/sources/application/models/source-ingestion-kind.enum';
import type { DeleteContentUseCase } from 'src/domain/rag/indexers/application/use-cases/delete-content/delete-content.use-case';
import type { MarkSourceFailedUseCase } from 'src/domain/sources/application/use-cases/mark-source-failed/mark-source-failed.use-case';
import { UrlSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { TextType } from 'src/domain/sources/domain/source-type.enum';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { SourceProcessingErrorCode } from 'src/domain/sources/domain/source-processing-error-code.enum';
import { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import { SourceIngestionService } from './source-ingestion.service';
import type { IngestionFailureOutcome } from './source-ingestion.service';
import { SourceProcessingHelper } from './source-processing-helper.service';
import {
  type ExtractedTextSourceContent,
  TextSourceExtractor,
} from './text-source-extractor';

const ORG_ID = randomUUID();
const ROOT_URL = 'https://www.stadt.example/abfall';

class PageExtractor extends TextSourceExtractor<string> {
  readonly extract = jest.fn<Promise<ExtractedTextSourceContent>, [string]>();

  serves(text: string, ...contents: string[]): void {
    this.extract.mockImplementationOnce(async () => ({
      text,
      chunks: contents.map(
        (content) => new TextSourceContentChunk({ content, meta: {} }),
      ),
    }));
  }
}

const finalFailure = (): IngestionFailureOutcome => ({
  final: true,
  rethrow: null,
});

describe('Source ingestion run state (Postgres)', () => {
  let harness: SourcePostgresHarness;
  let extractor: PageExtractor;
  let markSourceFailed: { execute: jest.Mock };
  let deleteContent: { execute: jest.Mock };
  let service: SourceIngestionService;

  beforeAll(async () => {
    harness = await createSourcePostgresHarness(ORG_ID);
  });

  afterAll(async () => {
    await harness.destroy();
  });

  beforeEach(() => {
    extractor = new PageExtractor();
    markSourceFailed = { execute: jest.fn() };
    deleteContent = { execute: jest.fn() };
    service = new SourceIngestionService(
      harness.sourceRepository,
      harness.contentReplacement,
      new SourceProcessingHelper(
        deleteContent as unknown as DeleteContentUseCase,
        markSourceFailed as unknown as MarkSourceFailedUseCase,
      ),
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function run(sourceId: UUID, kind: SourceIngestionKind): Promise<void> {
    return service.ingest({
      sourceId,
      orgId: ORG_ID,
      kind,
      extractor,
      input: ROOT_URL,
      classifyFailure: finalFailure,
    });
  }

  function storedRow(sourceId: UUID): Promise<SourceRecord | null> {
    return harness.dataSource
      .getRepository(SourceRecord)
      .findOneBy({ id: sourceId });
  }

  async function readySource(): Promise<UUID> {
    const source = new UrlSource({
      name: 'www.stadt.example',
      type: TextType.WEB,
      url: ROOT_URL,
      status: SourceStatus.PROCESSING,
      processingStartedAt: new Date(),
    });
    await harness.sourceRepository.save(source);
    extractor.serves('Abfuhr 2025', 'Restmüll 2025', 'Biotonne 2025');
    await run(source.id, SourceIngestionKind.INITIAL);
    return source.id;
  }

  it('marks a first run ready and stamps when its content went live', async () => {
    const before = new Date();

    const sourceId = await readySource();

    const row = await storedRow(sourceId);
    expect(row?.status).toBe(SourceStatus.READY);
    expect(row?.lastIndexedAt?.getTime()).toBeGreaterThanOrEqual(
      before.getTime() - 1000,
    );
  });

  it('keeps status, text, chunks and index of a ready source when a re-index fails', async () => {
    const sourceId = await readySource();
    const contentBefore = await harness.storedContent(sourceId);
    const rowBefore = await storedRow(sourceId);
    extractor.extract.mockRejectedValueOnce(
      new Error('getaddrinfo ENOTFOUND www.stadt.example'),
    );

    await run(sourceId, SourceIngestionKind.REINDEX);

    await expect(harness.storedContent(sourceId)).resolves.toEqual(
      contentBefore,
    );
    const row = await storedRow(sourceId);
    expect(row).toMatchObject({
      status: SourceStatus.READY,
      name: rowBefore!.name,
      lastIndexedAt: rowBefore!.lastIndexedAt,
      lastRunError: 'getaddrinfo ENOTFOUND www.stadt.example',
      lastRunErrorCode: SourceProcessingErrorCode.PROCESSING_FAILED,
    });
    expect(row?.lastRunFailedAt).toBeInstanceOf(Date);
    expect(markSourceFailed.execute).not.toHaveBeenCalled();
    expect(deleteContent.execute).not.toHaveBeenCalled();
  });

  it('keeps the previous content when a re-index fails inside its commit', async () => {
    const sourceId = await readySource();
    const contentBefore = await harness.storedContent(sourceId);
    extractor.serves('Abfuhr 2026', 'Restmüll 2026');
    jest
      .spyOn(harness.indexRepository, 'saveMany')
      .mockRejectedValueOnce(new Error('connection reset while inserting'));

    await run(sourceId, SourceIngestionKind.REINDEX);

    await expect(harness.storedContent(sourceId)).resolves.toEqual(
      contentBefore,
    );
    const row = await storedRow(sourceId);
    expect(row?.status).toBe(SourceStatus.READY);
    expect(row?.lastRunError).toBe('connection reset while inserting');
  });

  it('replaces the content and clears the previous failure on a successful re-index', async () => {
    const sourceId = await readySource();
    const indexedBefore = (await storedRow(sourceId))!.lastIndexedAt!;
    extractor.extract.mockRejectedValueOnce(
      new Error('getaddrinfo ENOTFOUND www.stadt.example'),
    );
    await run(sourceId, SourceIngestionKind.REINDEX);
    extractor.serves('Abfuhr 2026', 'Restmüll 2026', 'Gelber Sack 2026');

    await run(sourceId, SourceIngestionKind.REINDEX);

    const content = await harness.storedContent(sourceId);
    expect(content.texts).toEqual(['Abfuhr 2026']);
    expect(content.chunkContents).toEqual([
      'Gelber Sack 2026',
      'Restmüll 2026',
    ]);
    expect(content.indexedContents).toEqual(content.chunkContents);
    const row = await storedRow(sourceId);
    expect(row).toMatchObject({
      status: SourceStatus.READY,
      lastRunFailedAt: null,
      lastRunError: null,
      lastRunErrorCode: null,
    });
    expect(row!.lastIndexedAt!.getTime()).toBeGreaterThan(
      indexedBefore.getTime(),
    );
  });

  it('leaves a re-indexing source READY, out of reach of the stale-processing cleanup', async () => {
    const sourceId = await readySource();
    let statusDuringRun: SourceStatus | undefined;
    let staleDuringRun: UUID[] = [];
    extractor.extract.mockImplementationOnce(async () => {
      statusDuringRun = (await storedRow(sourceId))?.status;
      staleDuringRun =
        await harness.sourceRepository.findStaleProcessingSourceIds(
          new Date(Date.now() + 24 * 60 * 60 * 1000),
          100,
        );
      return { text: 'Abfuhr 2026', chunks: [] };
    });

    await run(sourceId, SourceIngestionKind.REINDEX);

    expect(statusDuringRun).toBe(SourceStatus.READY);
    expect(staleDuringRun).not.toContain(sourceId);
  });

  it.each([
    ['succeeds', () => ({ text: 'Abfuhr 2026', chunks: [] })],
    [
      'fails',
      () => {
        throw new Error('getaddrinfo ENOTFOUND www.stadt.example');
      },
    ],
  ])(
    'writes nothing for a source deleted while its re-index runs, whether the run %s',
    async (_case, outcome) => {
      const sourceId = await readySource();
      extractor.extract.mockImplementationOnce(async () => {
        await harness.dataSource
          .getRepository(SourceRecord)
          .delete({ id: sourceId });
        return outcome();
      });

      await run(sourceId, SourceIngestionKind.REINDEX);

      await expect(storedRow(sourceId)).resolves.toBeNull();
      const content = await harness.storedContent(sourceId);
      expect(content.texts).toEqual([]);
      expect(content.indexedChunkIds).toEqual([]);
    },
  );
});

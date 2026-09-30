import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import { UrlCrawlProcessingPort } from 'src/domain/sources/application/ports/url-crawl-processing.port';
import { SourceIngestionKind } from 'src/domain/sources/application/models/source-ingestion-kind.enum';
import { createMockSourceRepository } from 'src/domain/sources/application/testing/source.fixtures';
import {
  SourceNotFoundError,
  SourceNotReadyForReindexError,
  SourceReindexNotSupportedError,
  UnexpectedSourceError,
} from 'src/domain/sources/application/sources.errors';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { FileType, TextType } from 'src/domain/sources/domain/source-type.enum';
import { CSVDataSource } from 'src/domain/sources/domain/sources/data-source.entity';
import {
  FileSource,
  UrlSource,
} from 'src/domain/sources/domain/sources/text-source.entity';
import { EnqueueSourceReindexCommand } from './enqueue-source-reindex.command';
import { EnqueueSourceReindexUseCase } from './enqueue-source-reindex.use-case';

const SOURCE_ID = '00000000-0000-0000-0000-000000000001' as UUID;
const ORG_ID = '00000000-0000-0000-0000-000000000010' as UUID;
const USER_ID = '00000000-0000-0000-0000-000000000020' as UUID;

function urlSource(status = SourceStatus.READY): UrlSource {
  return new UrlSource({
    id: SOURCE_ID,
    name: 'Abfallkalender',
    type: TextType.WEB,
    url: 'https://www.stadt.example/abfall',
    maxDepth: 2,
    status,
  });
}

describe('EnqueueSourceReindexUseCase', () => {
  let useCase: EnqueueSourceReindexUseCase;
  let sourceRepository: ReturnType<typeof createMockSourceRepository>;
  let urlCrawlProcessing: jest.Mocked<UrlCrawlProcessingPort>;

  const command = new EnqueueSourceReindexCommand({
    sourceId: SOURCE_ID,
    orgId: ORG_ID,
    userId: USER_ID,
  });

  beforeEach(async () => {
    sourceRepository = createMockSourceRepository();
    urlCrawlProcessing = {
      enqueue: jest.fn().mockResolvedValue(undefined),
      cancelJob: jest.fn().mockResolvedValue(undefined),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnqueueSourceReindexUseCase,
        { provide: SourceRepository, useValue: sourceRepository },
        { provide: UrlCrawlProcessingPort, useValue: urlCrawlProcessing },
      ],
    }).compile();
    useCase = module.get(EnqueueSourceReindexUseCase);
  });

  it('enqueues a re-index crawl of the stored url and depth for the given org and user', async () => {
    sourceRepository.findById.mockResolvedValue(urlSource());

    await useCase.execute(command);

    expect(urlCrawlProcessing.enqueue).toHaveBeenCalledWith({
      sourceId: SOURCE_ID,
      orgId: ORG_ID,
      userId: USER_ID,
      rootUrl: 'https://www.stadt.example/abfall',
      maxDepth: 2,
      kind: SourceIngestionKind.REINDEX,
    });
  });

  it('enqueues a system-initiated re-index without a requesting user', async () => {
    sourceRepository.findById.mockResolvedValue(urlSource());

    await useCase.execute(
      new EnqueueSourceReindexCommand({ sourceId: SOURCE_ID, orgId: ORG_ID }),
    );

    const [job] = urlCrawlProcessing.enqueue.mock.calls[0];
    expect(job).toMatchObject({ sourceId: SOURCE_ID, orgId: ORG_ID });
    expect(job.userId).toBeUndefined();
  });

  it('rejects a source that does not exist', async () => {
    await expect(useCase.execute(command)).rejects.toThrow(SourceNotFoundError);
    expect(urlCrawlProcessing.enqueue).not.toHaveBeenCalled();
  });

  it.each([
    [
      'a file source, whose raw file is gone after processing',
      new FileSource({
        id: SOURCE_ID,
        name: 'Haushaltssatzung.pdf',
        type: TextType.FILE,
        fileType: FileType.PDF,
      }),
    ],
    [
      'a data source',
      new CSVDataSource({
        id: SOURCE_ID,
        name: 'haushalt.csv',
        data: { headers: [], rows: [] },
      }),
    ],
  ])('rejects %s', async (_case, source) => {
    sourceRepository.findById.mockResolvedValue(source);

    await expect(useCase.execute(command)).rejects.toThrow(
      SourceReindexNotSupportedError,
    );
    expect(urlCrawlProcessing.enqueue).not.toHaveBeenCalled();
  });

  it.each([SourceStatus.PROCESSING, SourceStatus.FAILED])(
    'rejects a url source whose status is %s',
    async (status) => {
      sourceRepository.findById.mockResolvedValue(urlSource(status));

      await expect(useCase.execute(command)).rejects.toThrow(
        SourceNotReadyForReindexError,
      );
      expect(urlCrawlProcessing.enqueue).not.toHaveBeenCalled();
    },
  );

  it('wraps a queue failure in an unexpected source error', async () => {
    sourceRepository.findById.mockResolvedValue(urlSource());
    urlCrawlProcessing.enqueue.mockRejectedValue(
      new Error('Redis connection refused'),
    );

    await expect(useCase.execute(command)).rejects.toThrow(
      UnexpectedSourceError,
    );
  });
});

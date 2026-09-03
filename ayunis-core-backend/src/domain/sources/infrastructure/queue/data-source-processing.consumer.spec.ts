import { randomUUID } from 'crypto';
import type { Job } from 'bullmq';
import { DataSourceProcessingConsumer } from './data-source-processing.consumer';
import type { DataSourceProcessingJobData } from 'src/domain/sources/application/ports/data-source-processing.port';
import type { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import { createMockSourceRepository } from 'src/domain/sources/application/testing/source.fixtures';
import type { SpreadsheetParserPort } from 'src/domain/sources/application/ports/spreadsheet-parser.port';
import type { MarkSourceFailedUseCase } from 'src/domain/sources/application/use-cases/mark-source-failed/mark-source-failed.use-case';
import type { DownloadObjectUseCase } from 'src/domain/storage/application/use-cases/download-object/download-object.use-case';
import type { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import type { ContextService } from 'src/common/context/services/context.service';
import { CSVDataSource } from 'src/domain/sources/domain/sources/data-source.entity';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';

async function* fileStream(): AsyncGenerator<Buffer> {
  yield Buffer.from('file-bytes');
}

describe('DataSourceProcessingConsumer', () => {
  const orgId = randomUUID();
  const userId = randomUUID();

  let sourceRepository: jest.Mocked<SourceRepository>;
  let parser: jest.Mocked<SpreadsheetParserPort>;
  let markSourceFailed: jest.Mocked<MarkSourceFailedUseCase>;
  let downloadObject: jest.Mocked<DownloadObjectUseCase>;
  let deleteObject: jest.Mocked<DeleteObjectUseCase>;
  let consumer: DataSourceProcessingConsumer;

  function processingSource(name: string): CSVDataSource {
    return new CSVDataSource({
      name,
      data: { headers: [], rows: [] },
      status: SourceStatus.PROCESSING,
      processingStartedAt: new Date(),
    });
  }

  function jobFor(
    data: Partial<DataSourceProcessingJobData>,
    opts: { finalAttempt?: boolean } = {},
  ): Job<DataSourceProcessingJobData> {
    return {
      id: 'job-1',
      data: {
        uploadId: randomUUID(),
        orgId,
        userId,
        minioPath: `${orgId}/processing/x/haushalt.xlsx`,
        fileName: 'haushalt.xlsx',
        kind: 'spreadsheet',
        targets: [],
        ...data,
      },
      attemptsMade: opts.finalAttempt ? 2 : 0,
      opts: { attempts: 3 },
    } as unknown as Job<DataSourceProcessingJobData>;
  }

  beforeEach(() => {
    sourceRepository = createMockSourceRepository();
    parser = {
      parseWorkbook: jest.fn(),
      parseCsv: jest.fn(),
    } as unknown as jest.Mocked<SpreadsheetParserPort>;
    markSourceFailed = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<MarkSourceFailedUseCase>;
    downloadObject = {
      execute: jest.fn().mockResolvedValue(fileStream()),
    } as unknown as jest.Mocked<DownloadObjectUseCase>;
    deleteObject = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<DeleteObjectUseCase>;
    const contextService = {
      run: jest.fn((fn: () => Promise<void>) => fn()),
      set: jest.fn(),
    } as unknown as ContextService;

    consumer = new DataSourceProcessingConsumer(
      contextService,
      downloadObject,
      deleteObject,
      sourceRepository,
      parser,
      markSourceFailed,
    );
  });

  it('fills each source with its sheet data and flips it to READY', async () => {
    const first = processingSource('haushalt_Plan_2026.csv');
    const second = processingSource('haushalt_Plan_2027.csv');
    sourceRepository.findById.mockImplementation((id) =>
      Promise.resolve(
        [first, second].find((source) => source.id === id) ?? null,
      ),
    );
    parser.parseWorkbook.mockResolvedValue([
      { sheetName: 'Plan 2026', headers: ['Jahr'], rows: [['2026']] },
      { sheetName: 'Plan 2027', headers: ['Jahr'], rows: [['2027']] },
    ]);

    await consumer.process(
      jobFor({
        targets: [
          { sourceId: first.id, sheetName: 'Plan 2026' },
          { sourceId: second.id, sheetName: 'Plan 2027' },
        ],
      }),
    );

    expect(sourceRepository.updateCsvSourceData).toHaveBeenCalledWith(
      first.id,
      { headers: ['Jahr'], rows: [['2026']] },
    );
    expect(sourceRepository.updateCsvSourceData).toHaveBeenCalledWith(
      second.id,
      { headers: ['Jahr'], rows: [['2027']] },
    );
    expect(sourceRepository.updateStatusConditionally).toHaveBeenCalledWith(
      first.id,
      SourceStatus.PROCESSING,
      SourceStatus.READY,
      { processingError: null },
    );
    expect(deleteObject.execute).toHaveBeenCalledTimes(1);
    expect(markSourceFailed.execute).not.toHaveBeenCalled();
  });

  it('parses CSV files through the CSV worker task', async () => {
    const source = processingSource('einwohner.csv');
    sourceRepository.findById.mockResolvedValue(source);
    parser.parseCsv.mockResolvedValue({
      headers: ['Name'],
      rows: [['Alice']],
    });

    await consumer.process(
      jobFor({
        kind: 'csv',
        targets: [{ sourceId: source.id, sheetName: null }],
      }),
    );

    expect(parser.parseCsv).toHaveBeenCalled();
    expect(parser.parseWorkbook).not.toHaveBeenCalled();
    expect(sourceRepository.updateCsvSourceData).toHaveBeenCalledWith(
      source.id,
      { headers: ['Name'], rows: [['Alice']] },
    );
  });

  it('never flips READY when the source was deleted mid-processing', async () => {
    const source = processingSource('haushalt.csv');
    sourceRepository.findById.mockResolvedValue(source);
    parser.parseWorkbook.mockResolvedValue([
      { sheetName: 'A', headers: ['H'], rows: [['v']] },
    ]);
    // The guarded UPDATE affects zero rows — the source row is gone.
    sourceRepository.updateCsvSourceData.mockResolvedValue(false);

    await consumer.process(
      jobFor({ targets: [{ sourceId: source.id, sheetName: 'A' }] }),
    );

    expect(sourceRepository.updateStatusConditionally).not.toHaveBeenCalled();
    expect(markSourceFailed.execute).not.toHaveBeenCalled();
  });

  it('skips a target whose heartbeat refresh finds no processing row', async () => {
    const source = processingSource('haushalt.csv');
    sourceRepository.findById.mockResolvedValue(source);
    sourceRepository.refreshProcessingHeartbeat.mockResolvedValue(false);

    await consumer.process(
      jobFor({ targets: [{ sourceId: source.id, sheetName: 'A' }] }),
    );

    expect(parser.parseWorkbook).not.toHaveBeenCalled();
    expect(sourceRepository.updateCsvSourceData).not.toHaveBeenCalled();
    expect(deleteObject.execute).toHaveBeenCalledTimes(1);
  });

  it('marks a source FAILED when its sheet was dropped as empty', async () => {
    const source = processingSource('haushalt_Leer.csv');
    sourceRepository.findById.mockResolvedValue(source);
    parser.parseWorkbook.mockResolvedValue([]);

    await consumer.process(
      jobFor({ targets: [{ sourceId: source.id, sheetName: 'Leer' }] }),
    );

    expect(markSourceFailed.execute).toHaveBeenCalledWith(
      expect.objectContaining({ sourceId: source.id }),
    );
    expect(sourceRepository.updateStatusConditionally).not.toHaveBeenCalled();
  });

  it('skips the parse entirely when no source is still processing', async () => {
    sourceRepository.findById.mockResolvedValue(null);

    await consumer.process(
      jobFor({ targets: [{ sourceId: randomUUID(), sheetName: 'A' }] }),
    );

    expect(parser.parseWorkbook).not.toHaveBeenCalled();
    expect(deleteObject.execute).toHaveBeenCalledTimes(1);
  });

  it('marks still-processing sources FAILED on the final attempt and cleans up', async () => {
    const source = processingSource('haushalt.csv');
    sourceRepository.findById.mockResolvedValue(source);
    parser.parseWorkbook.mockRejectedValue(new Error('corrupt workbook'));

    await expect(
      consumer.process(
        jobFor(
          { targets: [{ sourceId: source.id, sheetName: 'A' }] },
          { finalAttempt: true },
        ),
      ),
    ).rejects.toThrow('corrupt workbook');

    expect(markSourceFailed.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: source.id,
        errorMessage: 'corrupt workbook',
      }),
    );
    expect(deleteObject.execute).toHaveBeenCalledTimes(1);
  });

  it('rethrows without marking sources FAILED when retries remain', async () => {
    const source = processingSource('haushalt.csv');
    sourceRepository.findById.mockResolvedValue(source);
    parser.parseWorkbook.mockRejectedValue(new Error('transient minio error'));

    await expect(
      consumer.process(
        jobFor({ targets: [{ sourceId: source.id, sheetName: 'A' }] }),
      ),
    ).rejects.toThrow();

    expect(markSourceFailed.execute).not.toHaveBeenCalled();
    expect(deleteObject.execute).not.toHaveBeenCalled();
  });
});

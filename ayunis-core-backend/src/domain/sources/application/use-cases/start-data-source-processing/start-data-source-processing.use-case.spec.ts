import { randomUUID } from 'crypto';

jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (_target: unknown, _prop: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import { ApplicationError } from 'src/common/errors/base.error';
import { StartDataSourceProcessingUseCase } from './start-data-source-processing.use-case';
import { StartDataSourceProcessingCommand } from './start-data-source-processing.command';
import type { SourceRepository } from '../../ports/source.repository';
import { createMockSourceRepository } from '../../testing/source.fixtures';
import type { SpreadsheetParserPort } from '../../ports/spreadsheet-parser.port';
import type { MarkSourceFailedUseCase } from '../mark-source-failed/mark-source-failed.use-case';
import type { EnqueueDataSourceProcessingUseCase } from '../enqueue-data-source-processing/enqueue-data-source-processing.use-case';
import type { UploadObjectUseCase } from 'src/domain/storage/application/use-cases/upload-object/upload-object.use-case';
import type { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import type { ContextService } from 'src/common/context/services/context.service';
import { CSVDataSource } from '../../../domain/sources/data-source.entity';
import { SourceStatus } from '../../../domain/source-status.enum';
import {
  EmptyFileDataError,
  UnexpectedSourceError,
} from '../../sources.errors';

describe('StartDataSourceProcessingUseCase', () => {
  const orgId = randomUUID();
  const userId = randomUUID();

  let sourceRepository: jest.Mocked<SourceRepository>;
  let parser: jest.Mocked<SpreadsheetParserPort>;
  let markSourceFailed: jest.Mocked<MarkSourceFailedUseCase>;
  let uploadObject: jest.Mocked<UploadObjectUseCase>;
  let deleteObject: jest.Mocked<DeleteObjectUseCase>;
  let enqueue: jest.Mocked<EnqueueDataSourceProcessingUseCase>;
  let useCase: StartDataSourceProcessingUseCase;

  beforeEach(() => {
    sourceRepository = createMockSourceRepository();
    parser = {
      listDataSheets: jest.fn(),
    } as unknown as jest.Mocked<SpreadsheetParserPort>;
    markSourceFailed = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<MarkSourceFailedUseCase>;
    uploadObject = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<UploadObjectUseCase>;
    deleteObject = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<DeleteObjectUseCase>;
    enqueue = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EnqueueDataSourceProcessingUseCase>;
    const contextService = {
      get: jest.fn((key: string) => (key === 'orgId' ? orgId : userId)),
    } as unknown as ContextService;

    useCase = new StartDataSourceProcessingUseCase(
      sourceRepository,
      parser,
      markSourceFailed,
      uploadObject,
      deleteObject,
      enqueue,
      contextService,
    );
  });

  function spreadsheetCommand(
    fileName = 'haushalt.xlsx',
  ): StartDataSourceProcessingCommand {
    return new StartDataSourceProcessingCommand({
      fileData: Buffer.from('xlsx-bytes'),
      fileName,
      kind: 'spreadsheet',
    });
  }

  it('creates one PROCESSING source per sheet with the sheet naming convention', async () => {
    parser.listDataSheets.mockResolvedValue(['Plan 2026', 'Plan 2027']);

    const sources = await useCase.execute(spreadsheetCommand());

    expect(sources).toHaveLength(2);
    expect(sources.map((source) => source.name)).toEqual([
      'haushalt_Plan_2026.csv',
      'haushalt_Plan_2027.csv',
    ]);
    for (const source of sources) {
      expect(source).toBeInstanceOf(CSVDataSource);
      expect(source.status).toBe(SourceStatus.PROCESSING);
      expect(source.processingStartedAt).toBeInstanceOf(Date);
      expect(source.data).toEqual({ headers: [], rows: [] });
    }
  });

  it('names a single-sheet spreadsheet source after the file', async () => {
    parser.listDataSheets.mockResolvedValue(['Tabelle1']);

    const sources = await useCase.execute(spreadsheetCommand());

    expect(sources.map((source) => source.name)).toEqual(['haushalt.csv']);
  });

  it('enqueues one job keyed by an upload id independent of any source id', async () => {
    parser.listDataSheets.mockResolvedValue(['A', 'B']);

    const sources = await useCase.execute(spreadsheetCommand());

    expect(enqueue.execute).toHaveBeenCalledTimes(1);
    expect(enqueue.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId,
        userId,
        kind: 'spreadsheet',
        targets: [
          { sourceId: sources[0].id, sheetName: 'A' },
          { sourceId: sources[1].id, sheetName: 'B' },
        ],
      }),
    );
    const { uploadId, minioPath } = enqueue.execute.mock.calls[0][0] as {
      uploadId: string;
      minioPath: string;
    };
    // Deleting one sheet source must never affect the shared job/file, so
    // neither may be keyed by a source id.
    expect(sources.map((source) => source.id)).not.toContain(uploadId);
    expect(minioPath).toBe(`${orgId}/processing/${uploadId}/haushalt.xlsx`);
    expect(uploadObject.execute).toHaveBeenCalledTimes(1);
  });

  it('rejects an over-capacity workbook via the callback before creating anything', async () => {
    parser.listDataSheets.mockResolvedValue(['A', 'B', 'C']);
    // Stands in for a caller-module limit error (e.g.
    // ThreadSourceLimitExceededError) — it must propagate unwrapped.
    class CapacityError extends ApplicationError {
      constructor() {
        super('only 2 slots left', 'SOURCE_LIMIT_EXCEEDED', 409);
      }
    }
    const ensureCapacityFor = jest.fn((sourceCount: number) => {
      if (sourceCount > 2) throw new CapacityError();
    });

    await expect(
      useCase.execute(
        new StartDataSourceProcessingCommand({
          fileData: Buffer.from('xlsx-bytes'),
          fileName: 'haushalt.xlsx',
          kind: 'spreadsheet',
          ensureCapacityFor,
        }),
      ),
    ).rejects.toBeInstanceOf(CapacityError);
    expect(ensureCapacityFor).toHaveBeenCalledWith(3);
    expect(sourceRepository.save).not.toHaveBeenCalled();
    expect(uploadObject.execute).not.toHaveBeenCalled();
    expect(enqueue.execute).not.toHaveBeenCalled();
  });

  it('rejects a workbook with no data sheets before creating anything', async () => {
    parser.listDataSheets.mockResolvedValue([]);

    await expect(
      useCase.execute(spreadsheetCommand('leer.xlsx')),
    ).rejects.toThrow(EmptyFileDataError);
    expect(sourceRepository.save).not.toHaveBeenCalled();
    expect(uploadObject.execute).not.toHaveBeenCalled();
    expect(enqueue.execute).not.toHaveBeenCalled();
  });

  it('creates a single source for a CSV without reading sheet metadata', async () => {
    const sources = await useCase.execute(
      new StartDataSourceProcessingCommand({
        fileData: Buffer.from('a,b\n1,2'),
        fileName: 'einwohner.csv',
        kind: 'csv',
      }),
    );

    expect(sources.map((source) => source.name)).toEqual(['einwohner.csv']);
    expect(parser.listDataSheets).not.toHaveBeenCalled();
    expect(enqueue.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'csv',
        targets: [{ sourceId: sources[0].id, sheetName: null }],
      }),
    );
  });

  it('marks every created source FAILED when the storage upload fails', async () => {
    parser.listDataSheets.mockResolvedValue(['A', 'B']);
    uploadObject.execute.mockRejectedValue(new Error('minio down'));

    await expect(useCase.execute(spreadsheetCommand())).rejects.toThrow(
      UnexpectedSourceError,
    );
    expect(markSourceFailed.execute).toHaveBeenCalledTimes(2);
    expect(enqueue.execute).not.toHaveBeenCalled();
  });

  it('marks sources FAILED and removes the uploaded file when enqueueing fails', async () => {
    parser.listDataSheets.mockResolvedValue(['A']);
    enqueue.execute.mockRejectedValue(new Error('redis down'));

    await expect(useCase.execute(spreadsheetCommand())).rejects.toThrow(
      UnexpectedSourceError,
    );
    expect(markSourceFailed.execute).toHaveBeenCalledTimes(1);
    expect(deleteObject.execute).toHaveBeenCalledTimes(1);
  });
});

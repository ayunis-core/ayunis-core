import { randomUUID } from 'crypto';
import { AuthorizedCsvSourceResolverService } from './authorized-csv-source-resolver.service';
import type { GetThreadSourcesUseCase } from 'src/domain/threads/application/use-cases/get-thread-sources/get-thread-sources.use-case';
import { CSVDataSource } from 'src/domain/sources/domain/sources/data-source.entity';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { SourceCreator } from 'src/domain/sources/domain/source-creator.enum';
import { Logger } from '@nestjs/common';

describe('AuthorizedCsvSourceResolverService', () => {
  let service: AuthorizedCsvSourceResolverService;
  let getThreadSourcesUseCase: jest.Mocked<GetThreadSourcesUseCase>;
  let loggerErrorSpy: jest.SpiedFunction<Logger['error']>;

  beforeEach(() => {
    getThreadSourcesUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetThreadSourcesUseCase>;
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    service = new AuthorizedCsvSourceResolverService(getThreadSourcesUseCase);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function createCsvSource(
    status = SourceStatus.READY,
    createdBy = SourceCreator.USER,
  ): CSVDataSource {
    return new CSVDataSource({
      id: randomUUID(),
      name: 'municipal-budget',
      status,
      createdBy,
      data: {
        headers: ['department', 'amount'],
        rows: [['Library', '120000']],
      },
    });
  }

  it('resolves a newly generated READY CSV attached to the current thread', async () => {
    const generatedSource = createCsvSource(
      SourceStatus.READY,
      SourceCreator.LLM,
    );
    getThreadSourcesUseCase.execute.mockResolvedValue([generatedSource]);

    const result = await service.resolve({
      threadId: randomUUID(),
      sourceIds: [generatedSource.id],
    });

    expect(result).toEqual([generatedSource]);
  });

  it('rejects the full request when one source is not attached', async () => {
    const attachedSource = createCsvSource();
    const unattachedSourceId = randomUUID();
    getThreadSourcesUseCase.execute.mockResolvedValue([attachedSource]);

    await expect(
      service.resolve({
        threadId: randomUUID(),
        sourceIds: [attachedSource.id, unattachedSourceId],
      }),
    ).rejects.toThrow(
      `Data source ${unattachedSourceId} is not attached to this conversation.`,
    );
    expect(loggerErrorSpy).not.toHaveBeenCalled();
  });

  it('logs an unexpected thread source lookup failure', async () => {
    const lookupError = new Error('PostgreSQL connection was interrupted');
    const threadId = randomUUID();
    getThreadSourcesUseCase.execute.mockRejectedValue(lookupError);

    await expect(
      service.resolve({ threadId, sourceIds: [randomUUID()] }),
    ).rejects.toThrow(lookupError);

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      { err: lookupError, threadId },
      'Failed to resolve authorized CSV sources',
    );
  });

  it.each([
    [SourceStatus.PROCESSING, 'still processing'],
    [SourceStatus.FAILED, 'failed to process'],
  ])('rejects an attached %s CSV', async (status, message) => {
    const source = createCsvSource(status);
    getThreadSourcesUseCase.execute.mockResolvedValue([source]);

    await expect(
      service.resolve({
        threadId: randomUUID(),
        sourceIds: [source.id],
      }),
    ).rejects.toThrow(message);
  });

  it('preserves the processing error when a CSV failed', async () => {
    const source = createCsvSource(SourceStatus.FAILED);
    source.processingError = 'The CSV has inconsistent columns';
    getThreadSourcesUseCase.execute.mockResolvedValue([source]);

    await expect(
      service.resolve({
        threadId: randomUUID(),
        sourceIds: [source.id],
      }),
    ).rejects.toThrow('(The CSV has inconsistent columns)');
  });
});

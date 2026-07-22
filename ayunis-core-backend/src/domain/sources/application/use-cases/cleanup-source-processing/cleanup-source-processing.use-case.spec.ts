import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { CleanupSourceProcessingUseCase } from './cleanup-source-processing.use-case';
import { CleanupSourceProcessingCommand } from './cleanup-source-processing.command';
import { DocumentProcessingPort } from '../../ports/document-processing.port';
import { UrlCrawlProcessingPort } from '../../ports/url-crawl-processing.port';
import { PurgeStoragePrefixesUseCase } from 'src/domain/storage/application/use-cases/purge-storage-prefixes/purge-storage-prefixes.use-case';

describe('CleanupSourceProcessingUseCase', () => {
  let useCase: CleanupSourceProcessingUseCase;
  let documentProcessingPort: { cancelJob: jest.Mock };
  let urlCrawlProcessingPort: { cancelJob: jest.Mock };
  let purgeStoragePrefixesUseCase: { execute: jest.Mock };

  const orgId = '123e4567-e89b-12d3-a456-426614174002' as UUID;
  const sourceA = '00000000-0000-0000-0000-0000000000b1' as UUID;
  const sourceB = '00000000-0000-0000-0000-0000000000b2' as UUID;

  beforeEach(async () => {
    documentProcessingPort = {
      cancelJob: jest.fn().mockResolvedValue(undefined),
    };
    urlCrawlProcessingPort = {
      cancelJob: jest.fn().mockResolvedValue(undefined),
    };
    purgeStoragePrefixesUseCase = {
      execute: jest.fn().mockResolvedValue({ deletedCount: 0, failedCount: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CleanupSourceProcessingUseCase,
        { provide: DocumentProcessingPort, useValue: documentProcessingPort },
        { provide: UrlCrawlProcessingPort, useValue: urlCrawlProcessingPort },
        {
          provide: PurgeStoragePrefixesUseCase,
          useValue: purgeStoragePrefixesUseCase,
        },
      ],
    }).compile();

    useCase = module.get(CleanupSourceProcessingUseCase);
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => jest.clearAllMocks());

  it('cancels both pipelines and purges the processing prefix per source', async () => {
    await useCase.execute(
      new CleanupSourceProcessingCommand([sourceA, sourceB], orgId),
    );

    expect(documentProcessingPort.cancelJob).toHaveBeenCalledWith(sourceA);
    expect(documentProcessingPort.cancelJob).toHaveBeenCalledWith(sourceB);
    expect(urlCrawlProcessingPort.cancelJob).toHaveBeenCalledWith(sourceA);
    expect(urlCrawlProcessingPort.cancelJob).toHaveBeenCalledWith(sourceB);
    expect(purgeStoragePrefixesUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        prefixes: [
          `${orgId}/processing/${sourceA}/`,
          `${orgId}/processing/${sourceB}/`,
        ],
      }),
    );
  });

  it('does nothing for an empty source list', async () => {
    await useCase.execute(new CleanupSourceProcessingCommand([], orgId));

    expect(documentProcessingPort.cancelJob).not.toHaveBeenCalled();
    expect(urlCrawlProcessingPort.cancelJob).not.toHaveBeenCalled();
    expect(purgeStoragePrefixesUseCase.execute).not.toHaveBeenCalled();
  });

  it('resolves when the storage purge fails', async () => {
    purgeStoragePrefixesUseCase.execute.mockRejectedValue(
      new Error('storage unavailable'),
    );

    await expect(
      useCase.execute(new CleanupSourceProcessingCommand([sourceA], orgId)),
    ).resolves.toBeUndefined();
  });

  it('continues when cancelling a job fails', async () => {
    documentProcessingPort.cancelJob.mockRejectedValue(new Error('queue down'));
    urlCrawlProcessingPort.cancelJob.mockRejectedValue(new Error('queue down'));

    await expect(
      useCase.execute(new CleanupSourceProcessingCommand([sourceA], orgId)),
    ).resolves.toBeUndefined();

    expect(purgeStoragePrefixesUseCase.execute).toHaveBeenCalled();
  });
});

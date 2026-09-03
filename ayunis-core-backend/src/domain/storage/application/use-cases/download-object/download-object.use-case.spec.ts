import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DownloadObjectUseCase } from './download-object.use-case';
import { DownloadObjectCommand } from './download-object.command';
import { ObjectStoragePort } from 'src/domain/storage/application/ports/object-storage.port';
import storageConfig from 'src/config/storage.config';
import {
  DownloadFailedError,
  ObjectNotFoundError,
} from 'src/domain/storage/application/storage.errors';
import { Readable } from 'stream';

function networkError(code: string): Error {
  const error: NodeJS.ErrnoException = new Error(`${code} cdn-core.test`);
  error.code = code;
  return error;
}

describe('DownloadObjectUseCase', () => {
  let useCase: DownloadObjectUseCase;
  let mockObjectStorage: Partial<ObjectStoragePort>;

  const mockConfig = {
    minio: {
      bucket: 'test-bucket',
    },
  };

  beforeAll(async () => {
    mockObjectStorage = {
      download: jest.fn(),
      exists: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forFeature(storageConfig)],
      providers: [
        DownloadObjectUseCase,
        { provide: ObjectStoragePort, useValue: mockObjectStorage },
        {
          provide: storageConfig.KEY,
          useValue: mockConfig,
        },
      ],
    }).compile();

    useCase = module.get<DownloadObjectUseCase>(DownloadObjectUseCase);
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should download object successfully', async () => {
      const command = new DownloadObjectCommand('test-file.txt');
      const mockStream = new Readable();

      jest.spyOn(mockObjectStorage, 'download').mockResolvedValue(mockStream);

      const result = await useCase.execute(command);

      expect(result).toBe(mockStream);
    });

    it('should not stat the object before downloading it', async () => {
      const command = new DownloadObjectCommand('test-file.txt');
      jest
        .spyOn(mockObjectStorage, 'download')
        .mockResolvedValue(new Readable());

      await useCase.execute(command);

      // The extra round-trip is what made a single DNS blip fatal.
      expect(mockObjectStorage.exists).not.toHaveBeenCalled();
      expect(mockObjectStorage.download).toHaveBeenCalledTimes(1);
    });

    it('should pass through ObjectNotFoundError from the storage adapter', async () => {
      const command = new DownloadObjectCommand('missing.txt');
      jest
        .spyOn(mockObjectStorage, 'download')
        .mockRejectedValue(
          new ObjectNotFoundError({ objectName: 'missing.txt' }),
        );

      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        ObjectNotFoundError,
      );
    });

    it('should use default bucket when no bucket specified', async () => {
      const command = new DownloadObjectCommand('test-file.txt');
      jest
        .spyOn(mockObjectStorage, 'download')
        .mockResolvedValue(new Readable());

      await useCase.execute(command);

      expect(mockObjectStorage.download).toHaveBeenCalledWith(
        expect.objectContaining({ bucket: 'test-bucket' }),
      );
    });

    it('should use custom bucket when specified', async () => {
      const command = new DownloadObjectCommand('test-file.txt', 'custom');
      jest
        .spyOn(mockObjectStorage, 'download')
        .mockResolvedValue(new Readable());

      await useCase.execute(command);

      expect(mockObjectStorage.download).toHaveBeenCalledWith(
        expect.objectContaining({ bucket: 'custom' }),
      );
    });

    it('should retry a transient DNS failure and succeed', async () => {
      const command = new DownloadObjectCommand('test-file.txt');
      const mockStream = new Readable();

      jest
        .spyOn(mockObjectStorage, 'download')
        .mockRejectedValueOnce(networkError('EAI_AGAIN'))
        .mockResolvedValueOnce(mockStream);

      await expect(useCase.execute(command)).resolves.toBe(mockStream);
      expect(mockObjectStorage.download).toHaveBeenCalledTimes(2);
    });

    it('should give up after exhausting retries on a persistent network fault', async () => {
      const command = new DownloadObjectCommand('test-file.txt');
      jest
        .spyOn(mockObjectStorage, 'download')
        .mockRejectedValue(networkError('ECONNRESET'));

      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        DownloadFailedError,
      );
      expect(mockObjectStorage.download).toHaveBeenCalledTimes(3);
    });

    it('should not retry an error that a retry cannot fix', async () => {
      const command = new DownloadObjectCommand('test-file.txt');
      jest
        .spyOn(mockObjectStorage, 'download')
        .mockRejectedValue(new Error('Access Denied'));

      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        DownloadFailedError,
      );
      expect(mockObjectStorage.download).toHaveBeenCalledTimes(1);
    });

    it('should not retry a missing object', async () => {
      const command = new DownloadObjectCommand('missing.txt');
      jest
        .spyOn(mockObjectStorage, 'download')
        .mockRejectedValue(
          new ObjectNotFoundError({ objectName: 'missing.txt' }),
        );

      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        ObjectNotFoundError,
      );
      expect(mockObjectStorage.download).toHaveBeenCalledTimes(1);
    });

    it('should not expose the object path or the upstream message', async () => {
      const objectName = 'org-id/thread-id/message-id/3.jpg';
      const command = new DownloadObjectCommand(objectName);

      jest
        .spyOn(mockObjectStorage, 'download')
        .mockRejectedValue(
          new Error('getaddrinfo EAI_AGAIN cdn-core.ayunis.com'),
        );

      const error = await useCase.execute(command).catch((e: unknown) => e);

      const body = JSON.stringify(
        (error as DownloadFailedError).toHttpException().getResponse(),
      );
      expect(body).not.toContain(objectName);
      expect(body).not.toContain('cdn-core.ayunis.com');
    });
  });
});

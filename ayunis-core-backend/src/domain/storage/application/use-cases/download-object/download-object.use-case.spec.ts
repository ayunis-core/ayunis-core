import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DownloadObjectUseCase } from './download-object.use-case';
import { DownloadObjectCommand } from './download-object.command';
import { ObjectStoragePort } from '../../ports/object-storage.port';
import storageConfig from '../../../../../config/storage.config';
import { DownloadFailedError, ObjectNotFoundError } from '../../storage.errors';
import { Readable } from 'stream';

describe('DownloadObjectUseCase', () => {
  let useCase: DownloadObjectUseCase;
  let mockObjectStorage: Partial<ObjectStoragePort>;

  const mockConfig = {
    minio: {
      bucket: 'test-bucket',
    },
  };

  beforeEach(async () => {
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

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should download object successfully', async () => {
      // Arrange
      const objectName = 'test-file.txt';
      const command = new DownloadObjectCommand(objectName);
      const mockStream = new Readable();

      jest.spyOn(mockObjectStorage, 'exists').mockResolvedValue(true);
      jest.spyOn(mockObjectStorage, 'download').mockResolvedValue(mockStream);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(mockObjectStorage.exists).toHaveBeenCalled();
      expect(mockObjectStorage.download).toHaveBeenCalled();
      expect(result).toBe(mockStream);
    });

    it('should throw ObjectNotFoundError when object does not exist', async () => {
      // Arrange
      const objectName = 'non-existent-file.txt';
      const command = new DownloadObjectCommand(objectName);

      jest.spyOn(mockObjectStorage, 'exists').mockResolvedValue(false);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        ObjectNotFoundError,
      );
      expect(mockObjectStorage.exists).toHaveBeenCalled();
      expect(mockObjectStorage.download).not.toHaveBeenCalled();
    });

    it('should use default bucket when no bucket specified', async () => {
      // Arrange
      const objectName = 'test-file.txt';
      const command = new DownloadObjectCommand(objectName);
      const mockStream = new Readable();

      jest.spyOn(mockObjectStorage, 'exists').mockResolvedValue(true);
      jest.spyOn(mockObjectStorage, 'download').mockResolvedValue(mockStream);

      // Act
      await useCase.execute(command);

      // Assert
      expect(mockObjectStorage.exists).toHaveBeenCalledWith(
        expect.objectContaining({ bucket: 'test-bucket' }),
      );
    });

    it('should use custom bucket when specified', async () => {
      // Arrange
      const objectName = 'test-file.txt';
      const customBucket = 'custom-bucket';
      const command = new DownloadObjectCommand(objectName, customBucket);
      const mockStream = new Readable();

      jest.spyOn(mockObjectStorage, 'exists').mockResolvedValue(true);
      jest.spyOn(mockObjectStorage, 'download').mockResolvedValue(mockStream);

      // Act
      await useCase.execute(command);

      // Assert
      expect(mockObjectStorage.exists).toHaveBeenCalledWith(
        expect.objectContaining({ bucket: customBucket }),
      );
    });

    it('should throw DownloadFailedError on storage error', async () => {
      // Arrange
      const objectName = 'test-file.txt';
      const command = new DownloadObjectCommand(objectName);

      jest.spyOn(mockObjectStorage, 'exists').mockResolvedValue(true);
      jest
        .spyOn(mockObjectStorage, 'download')
        .mockRejectedValue(new Error('Storage error'));

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        DownloadFailedError,
      );
    });

    it('should pass through ObjectNotFoundError from download', async () => {
      // Arrange
      const objectName = 'test-file.txt';
      const command = new DownloadObjectCommand(objectName);

      jest.spyOn(mockObjectStorage, 'exists').mockResolvedValue(true);
      const notFoundError = new ObjectNotFoundError({ objectName });
      jest
        .spyOn(mockObjectStorage, 'download')
        .mockRejectedValue(notFoundError);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        ObjectNotFoundError,
      );
    });

    it('should handle exists check error gracefully', async () => {
      // Arrange
      const objectName = 'test-file.txt';
      const command = new DownloadObjectCommand(objectName);

      jest
        .spyOn(mockObjectStorage, 'exists')
        .mockRejectedValue(new Error('Exists check failed'));

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        DownloadFailedError,
      );
      expect(mockObjectStorage.download).not.toHaveBeenCalled();
    });
  });
});

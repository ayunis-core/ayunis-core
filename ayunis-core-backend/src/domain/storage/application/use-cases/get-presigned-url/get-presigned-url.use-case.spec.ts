import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { GetPresignedUrlUseCase } from './get-presigned-url.use-case';
import { GetPresignedUrlCommand } from './get-presigned-url.command';
import { ObjectStoragePort } from '../../ports/object-storage.port';
import { PresignedUrl } from '../../../domain/presigned-url.entity';
import { StorageUrl } from '../../../domain/storage-url.entity';
import storageConfig from '../../../../../config/storage.config';
import { DownloadFailedError, ObjectNotFoundError } from '../../storage.errors';

describe('GetPresignedUrlUseCase', () => {
  let useCase: GetPresignedUrlUseCase;
  let mockObjectStorage: Partial<ObjectStoragePort>;

  const mockConfig = {
    minio: {
      bucket: 'test-bucket',
    },
  };

  beforeEach(async () => {
    mockObjectStorage = {
      getPresignedUrl: jest.fn(),
      exists: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forFeature(storageConfig)],
      providers: [
        GetPresignedUrlUseCase,
        { provide: ObjectStoragePort, useValue: mockObjectStorage },
        {
          provide: storageConfig.KEY,
          useValue: mockConfig,
        },
      ],
    }).compile();

    useCase = module.get<GetPresignedUrlUseCase>(GetPresignedUrlUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should generate presigned URL successfully', async () => {
      // Arrange
      const objectName = 'test-file.txt';
      const expiresIn = 3600;
      const command = new GetPresignedUrlCommand(objectName, expiresIn);

      const mockUrl = new PresignedUrl(
        'https://example.com/presigned-url',
        expiresIn,
        new StorageUrl(objectName, 'test-bucket'),
      );

      jest.spyOn(mockObjectStorage, 'exists').mockResolvedValue(true);
      jest
        .spyOn(mockObjectStorage, 'getPresignedUrl')
        .mockResolvedValue(mockUrl);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(mockObjectStorage.exists).toHaveBeenCalled();
      expect(mockObjectStorage.getPresignedUrl).toHaveBeenCalled();
      expect(result).toBe(mockUrl);
    });

    it('should throw ObjectNotFoundError when object does not exist', async () => {
      // Arrange
      const objectName = 'non-existent-file.txt';
      const command = new GetPresignedUrlCommand(objectName, 3600);

      jest.spyOn(mockObjectStorage, 'exists').mockResolvedValue(false);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        ObjectNotFoundError,
      );
      expect(mockObjectStorage.exists).toHaveBeenCalled();
      expect(mockObjectStorage.getPresignedUrl).not.toHaveBeenCalled();
    });

    it('should use default bucket when no bucket specified', async () => {
      // Arrange
      const objectName = 'test-file.txt';
      const command = new GetPresignedUrlCommand(objectName, 3600);

      const mockUrl = new PresignedUrl(
        'https://example.com/presigned-url',
        3600,
        new StorageUrl(objectName, 'test-bucket'),
      );

      jest.spyOn(mockObjectStorage, 'exists').mockResolvedValue(true);
      jest
        .spyOn(mockObjectStorage, 'getPresignedUrl')
        .mockResolvedValue(mockUrl);

      // Act
      await useCase.execute(command);

      // Assert
      expect(mockObjectStorage.exists).toHaveBeenCalledWith(
        expect.objectContaining({ bucket: 'test-bucket' }),
      );
      expect(mockObjectStorage.getPresignedUrl).toHaveBeenCalledWith(
        expect.objectContaining({ bucket: 'test-bucket' }),
        3600,
      );
    });

    it('should use custom bucket when specified', async () => {
      // Arrange
      const objectName = 'test-file.txt';
      const customBucket = 'custom-bucket';
      const command = new GetPresignedUrlCommand(
        objectName,
        3600,
        customBucket,
      );

      const mockUrl = new PresignedUrl(
        'https://example.com/presigned-url',
        3600,
        new StorageUrl(objectName, customBucket),
      );

      jest.spyOn(mockObjectStorage, 'exists').mockResolvedValue(true);
      jest
        .spyOn(mockObjectStorage, 'getPresignedUrl')
        .mockResolvedValue(mockUrl);

      // Act
      await useCase.execute(command);

      // Assert
      expect(mockObjectStorage.exists).toHaveBeenCalledWith(
        expect.objectContaining({ bucket: customBucket }),
      );
      expect(mockObjectStorage.getPresignedUrl).toHaveBeenCalledWith(
        expect.objectContaining({ bucket: customBucket }),
        3600,
      );
    });

    it('should throw DownloadFailedError on storage error', async () => {
      // Arrange
      const objectName = 'test-file.txt';
      const command = new GetPresignedUrlCommand(objectName, 3600);

      jest.spyOn(mockObjectStorage, 'exists').mockResolvedValue(true);
      jest
        .spyOn(mockObjectStorage, 'getPresignedUrl')
        .mockRejectedValue(new Error('Storage error'));

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        DownloadFailedError,
      );
    });

    it('should pass through ObjectNotFoundError from getPresignedUrl', async () => {
      // Arrange
      const objectName = 'test-file.txt';
      const command = new GetPresignedUrlCommand(objectName, 3600);

      jest.spyOn(mockObjectStorage, 'exists').mockResolvedValue(true);
      const notFoundError = new ObjectNotFoundError({ objectName });
      jest
        .spyOn(mockObjectStorage, 'getPresignedUrl')
        .mockRejectedValue(notFoundError);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        ObjectNotFoundError,
      );
    });

    it('should handle exists check error gracefully', async () => {
      // Arrange
      const objectName = 'test-file.txt';
      const command = new GetPresignedUrlCommand(objectName, 3600);

      jest
        .spyOn(mockObjectStorage, 'exists')
        .mockRejectedValue(new Error('Exists check failed'));

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        DownloadFailedError,
      );
      expect(mockObjectStorage.getPresignedUrl).not.toHaveBeenCalled();
    });

    it('should handle different expiration times', async () => {
      // Arrange
      const objectName = 'test-file.txt';
      const expiresIn = 7200; // 2 hours
      const command = new GetPresignedUrlCommand(objectName, expiresIn);

      const mockUrl = new PresignedUrl(
        'https://example.com/presigned-url',
        expiresIn,
        new StorageUrl(objectName, 'test-bucket'),
      );

      jest.spyOn(mockObjectStorage, 'exists').mockResolvedValue(true);
      jest
        .spyOn(mockObjectStorage, 'getPresignedUrl')
        .mockResolvedValue(mockUrl);

      // Act
      await useCase.execute(command);

      // Assert
      expect(mockObjectStorage.getPresignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expiresIn,
      );
    });
  });
});

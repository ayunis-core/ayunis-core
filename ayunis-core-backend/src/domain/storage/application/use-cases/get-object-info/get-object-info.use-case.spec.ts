import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { GetObjectInfoUseCase } from './get-object-info.use-case';
import { GetObjectInfoCommand } from './get-object-info.command';
import { ObjectStoragePort } from '../../ports/object-storage.port';
import { StorageObject } from '../../../domain/storage-object.entity';
import storageConfig from '../../../../../config/storage.config';
import { DownloadFailedError, ObjectNotFoundError } from '../../storage.errors';

describe('GetObjectInfoUseCase', () => {
  let useCase: GetObjectInfoUseCase;
  let mockObjectStorage: Partial<ObjectStoragePort>;

  const mockConfig = {
    minio: {
      bucket: 'test-bucket',
    },
  };

  beforeEach(async () => {
    mockObjectStorage = {
      getObjectInfo: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forFeature(storageConfig)],
      providers: [
        GetObjectInfoUseCase,
        { provide: ObjectStoragePort, useValue: mockObjectStorage },
        {
          provide: storageConfig.KEY,
          useValue: mockConfig,
        },
      ],
    }).compile();

    useCase = module.get<GetObjectInfoUseCase>(GetObjectInfoUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should get object info successfully', async () => {
      // Arrange
      const objectName = 'test-file.txt';
      const command = new GetObjectInfoCommand(objectName);

      const mockResult = new StorageObject(
        objectName,
        'test-bucket',
        1024,
        'test-etag',
        { contentType: 'text/plain' },
        new Date(),
      );

      jest
        .spyOn(mockObjectStorage, 'getObjectInfo')
        .mockResolvedValue(mockResult);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(mockObjectStorage.getObjectInfo).toHaveBeenCalled();
      expect(result.objectName).toBe(objectName);
      expect(result.bucket).toBe('test-bucket');
      expect(result.size).toBe(1024);
      expect(result.etag).toBe('test-etag');
    });

    it('should use default bucket when no bucket specified', async () => {
      // Arrange
      const objectName = 'test-file.txt';
      const command = new GetObjectInfoCommand(objectName);

      const mockResult = new StorageObject(
        objectName,
        'test-bucket',
        1024,
        'test-etag',
        {},
        new Date(),
      );

      jest
        .spyOn(mockObjectStorage, 'getObjectInfo')
        .mockResolvedValue(mockResult);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(mockObjectStorage.getObjectInfo).toHaveBeenCalledWith(
        expect.objectContaining({ bucket: 'test-bucket' }),
      );
      expect(result.bucket).toBe('test-bucket');
    });

    it('should use custom bucket when specified', async () => {
      // Arrange
      const objectName = 'test-file.txt';
      const customBucket = 'custom-bucket';
      const command = new GetObjectInfoCommand(objectName, customBucket);

      const mockResult = new StorageObject(
        objectName,
        customBucket,
        1024,
        'test-etag',
        {},
        new Date(),
      );

      jest
        .spyOn(mockObjectStorage, 'getObjectInfo')
        .mockResolvedValue(mockResult);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(mockObjectStorage.getObjectInfo).toHaveBeenCalledWith(
        expect.objectContaining({ bucket: customBucket }),
      );
      expect(result.bucket).toBe(customBucket);
    });

    it('should throw ObjectNotFoundError when object not found', async () => {
      // Arrange
      const objectName = 'non-existent-file.txt';
      const command = new GetObjectInfoCommand(objectName);

      const error = new Error('Object not found');
      jest.spyOn(mockObjectStorage, 'getObjectInfo').mockRejectedValue(error);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        ObjectNotFoundError,
      );
    });

    it('should throw DownloadFailedError on other storage errors', async () => {
      // Arrange
      const objectName = 'test-file.txt';
      const command = new GetObjectInfoCommand(objectName);

      const error = new Error('Storage service unavailable');
      jest.spyOn(mockObjectStorage, 'getObjectInfo').mockRejectedValue(error);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        DownloadFailedError,
      );
    });

    it('should handle metadata correctly', async () => {
      // Arrange
      const objectName = 'test-file.txt';
      const command = new GetObjectInfoCommand(objectName);

      const mockResult = new StorageObject(
        objectName,
        'test-bucket',
        1024,
        'test-etag',
        {
          contentType: 'application/pdf',
          originalName: 'document.pdf',
          customField: 'custom-value',
        },
        new Date(),
      );

      jest
        .spyOn(mockObjectStorage, 'getObjectInfo')
        .mockResolvedValue(mockResult);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.contentType).toBe('application/pdf');
      expect(result.originalName).toBe('document.pdf');
    });
  });
});

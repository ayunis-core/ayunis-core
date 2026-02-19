import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { UploadObjectUseCase } from './upload-object.use-case';
import { UploadObjectCommand } from './upload-object.command';
import { ObjectStoragePort } from '../../ports/object-storage.port';
import { StorageObject } from '../../../domain/storage-object.entity';
import storageConfig from '../../../../../config/storage.config';
import {
  BucketNotFoundError,
  InvalidObjectNameError,
  StoragePermissionDeniedError,
  UploadFailedError,
} from '../../storage.errors';

describe('UploadObjectUseCase', () => {
  let useCase: UploadObjectUseCase;
  let mockObjectStorage: Partial<ObjectStoragePort>;

  const mockConfig = {
    minio: {
      bucket: 'test-bucket',
    },
  };

  beforeEach(async () => {
    mockObjectStorage = {
      upload: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forFeature(storageConfig)],
      providers: [
        UploadObjectUseCase,
        { provide: ObjectStoragePort, useValue: mockObjectStorage },
        {
          provide: storageConfig.KEY,
          useValue: mockConfig,
        },
      ],
    }).compile();

    useCase = module.get<UploadObjectUseCase>(UploadObjectUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should upload object successfully', async () => {
      // Arrange
      const objectName = 'test-file.txt';
      const data = Buffer.from('test data');
      const options = { contentType: 'text/plain' };
      const command = new UploadObjectCommand(objectName, data, options);

      const mockResult = new StorageObject(
        objectName,
        'test-bucket',
        1024,
        'test-etag',
        { contentType: 'text/plain' },
        new Date(),
      );

      jest.spyOn(mockObjectStorage, 'upload').mockResolvedValue(mockResult);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(mockObjectStorage.upload).toHaveBeenCalled();
      expect(result.objectName).toBe(objectName);
      expect(result.bucket).toBe('test-bucket');
      expect(result.size).toBe(1024);
      expect(result.etag).toBe('test-etag');
    });

    it('should throw InvalidObjectNameError for invalid object name', async () => {
      // Arrange
      const invalidObjectName = '';
      const data = Buffer.from('test data');
      const command = new UploadObjectCommand(invalidObjectName, data);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        InvalidObjectNameError,
      );
      expect(mockObjectStorage.upload).not.toHaveBeenCalled();
    });

    it('should throw InvalidObjectNameError for object name with control characters', async () => {
      // Arrange
      const invalidObjectName = 'test\x00file.txt';
      const data = Buffer.from('test data');
      const command = new UploadObjectCommand(invalidObjectName, data);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        InvalidObjectNameError,
      );
      expect(mockObjectStorage.upload).not.toHaveBeenCalled();
    });

    it('should throw InvalidObjectNameError for object name too long', async () => {
      // Arrange
      const invalidObjectName = 'a'.repeat(1025);
      const data = Buffer.from('test data');
      const command = new UploadObjectCommand(invalidObjectName, data);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        InvalidObjectNameError,
      );
      expect(mockObjectStorage.upload).not.toHaveBeenCalled();
    });

    it('should use default bucket when no bucket specified', async () => {
      // Arrange
      const objectName = 'test-file.txt';
      const data = Buffer.from('test data');
      const command = new UploadObjectCommand(objectName, data);

      const mockResult = new StorageObject(
        objectName,
        'test-bucket',
        1024,
        'test-etag',
        {},
        new Date(),
      );

      jest.spyOn(mockObjectStorage, 'upload').mockResolvedValue(mockResult);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.bucket).toBe('test-bucket');
    });

    it('should use custom bucket when specified', async () => {
      // Arrange
      const objectName = 'test-file.txt';
      const data = Buffer.from('test data');
      const customBucket = 'custom-bucket';
      const command = new UploadObjectCommand(
        objectName,
        data,
        {},
        customBucket,
      );

      const mockResult = new StorageObject(
        objectName,
        customBucket,
        1024,
        'test-etag',
        {},
        new Date(),
      );

      jest.spyOn(mockObjectStorage, 'upload').mockResolvedValue(mockResult);

      // Act
      const result = await useCase.execute(command);

      // Assert
      expect(result.bucket).toBe(customBucket);
    });

    it('should throw UploadFailedError on storage error', async () => {
      // Arrange
      const objectName = 'test-file.txt';
      const data = Buffer.from('test data');
      const command = new UploadObjectCommand(objectName, data);

      jest
        .spyOn(mockObjectStorage, 'upload')
        .mockRejectedValue(new Error('Storage error'));

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(UploadFailedError);
    });

    it('should pass through StoragePermissionDeniedError', async () => {
      // Arrange
      const objectName = 'test-file.txt';
      const data = Buffer.from('test data');
      const command = new UploadObjectCommand(objectName, data);

      const permissionError = new StoragePermissionDeniedError({
        operation: 'upload',
        objectName: 'test',
      });
      jest
        .spyOn(mockObjectStorage, 'upload')
        .mockRejectedValue(permissionError);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        StoragePermissionDeniedError,
      );
    });

    it('should pass through BucketNotFoundError', async () => {
      // Arrange
      const objectName = 'test-file.txt';
      const data = Buffer.from('test data');
      const command = new UploadObjectCommand(objectName, data);

      const bucketError = new BucketNotFoundError({ bucket: 'missing-bucket' });
      jest.spyOn(mockObjectStorage, 'upload').mockRejectedValue(bucketError);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        BucketNotFoundError,
      );
    });
  });
});

import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DeleteObjectUseCase } from './delete-object.use-case';
import { DeleteObjectCommand } from './delete-object.command';
import { ObjectStoragePort } from '../../ports/object-storage.port';
import storageConfig from '../../../../../config/storage.config';
import { DeleteFailedError, ObjectNotFoundError } from '../../storage.errors';

describe('DeleteObjectUseCase', () => {
  let useCase: DeleteObjectUseCase;
  let mockObjectStorage: Partial<ObjectStoragePort>;

  const mockConfig = {
    minio: {
      bucket: 'test-bucket',
    },
  };

  beforeAll(async () => {
    mockObjectStorage = {
      delete: jest.fn(),
      exists: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forFeature(storageConfig)],
      providers: [
        DeleteObjectUseCase,
        { provide: ObjectStoragePort, useValue: mockObjectStorage },
        {
          provide: storageConfig.KEY,
          useValue: mockConfig,
        },
      ],
    }).compile();

    useCase = module.get<DeleteObjectUseCase>(DeleteObjectUseCase);
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should delete object successfully', async () => {
      // Arrange
      const objectName = 'test-file.txt';
      const command = new DeleteObjectCommand(objectName);

      jest.spyOn(mockObjectStorage, 'exists').mockResolvedValue(true);
      jest.spyOn(mockObjectStorage, 'delete').mockResolvedValue(undefined);

      // Act
      await useCase.execute(command);

      // Assert
      expect(mockObjectStorage.exists).toHaveBeenCalled();
      expect(mockObjectStorage.delete).toHaveBeenCalled();
    });

    it('should throw ObjectNotFoundError when object does not exist', async () => {
      // Arrange
      const objectName = 'non-existent-file.txt';
      const command = new DeleteObjectCommand(objectName);

      jest.spyOn(mockObjectStorage, 'exists').mockResolvedValue(false);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        ObjectNotFoundError,
      );
      expect(mockObjectStorage.exists).toHaveBeenCalled();
      expect(mockObjectStorage.delete).not.toHaveBeenCalled();
    });

    it('should use default bucket when no bucket specified', async () => {
      // Arrange
      const objectName = 'test-file.txt';
      const command = new DeleteObjectCommand(objectName);

      jest.spyOn(mockObjectStorage, 'exists').mockResolvedValue(true);
      jest.spyOn(mockObjectStorage, 'delete').mockResolvedValue(undefined);

      // Act
      await useCase.execute(command);

      // Assert
      expect(mockObjectStorage.exists).toHaveBeenCalledWith(
        expect.objectContaining({ bucket: 'test-bucket' }),
      );
      expect(mockObjectStorage.delete).toHaveBeenCalledWith(
        expect.objectContaining({ bucket: 'test-bucket' }),
      );
    });

    it('should use custom bucket when specified', async () => {
      // Arrange
      const objectName = 'test-file.txt';
      const customBucket = 'custom-bucket';
      const command = new DeleteObjectCommand(objectName, customBucket);

      jest.spyOn(mockObjectStorage, 'exists').mockResolvedValue(true);
      jest.spyOn(mockObjectStorage, 'delete').mockResolvedValue(undefined);

      // Act
      await useCase.execute(command);

      // Assert
      expect(mockObjectStorage.exists).toHaveBeenCalledWith(
        expect.objectContaining({ bucket: customBucket }),
      );
      expect(mockObjectStorage.delete).toHaveBeenCalledWith(
        expect.objectContaining({ bucket: customBucket }),
      );
    });

    it('should throw DeleteFailedError on storage error', async () => {
      // Arrange
      const objectName = 'test-file.txt';
      const command = new DeleteObjectCommand(objectName);

      jest.spyOn(mockObjectStorage, 'exists').mockResolvedValue(true);
      jest
        .spyOn(mockObjectStorage, 'delete')
        .mockRejectedValue(new Error('Storage error'));

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(DeleteFailedError);
    });

    it('should pass through ObjectNotFoundError from delete', async () => {
      // Arrange
      const objectName = 'test-file.txt';
      const command = new DeleteObjectCommand(objectName);

      jest.spyOn(mockObjectStorage, 'exists').mockResolvedValue(true);
      const notFoundError = new ObjectNotFoundError({ objectName });
      jest.spyOn(mockObjectStorage, 'delete').mockRejectedValue(notFoundError);

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(
        ObjectNotFoundError,
      );
    });

    it('should handle exists check error gracefully', async () => {
      // Arrange
      const objectName = 'test-file.txt';
      const command = new DeleteObjectCommand(objectName);

      jest
        .spyOn(mockObjectStorage, 'exists')
        .mockRejectedValue(new Error('Exists check failed'));

      // Act & Assert
      await expect(useCase.execute(command)).rejects.toThrow(DeleteFailedError);
      expect(mockObjectStorage.delete).not.toHaveBeenCalled();
    });
  });
});

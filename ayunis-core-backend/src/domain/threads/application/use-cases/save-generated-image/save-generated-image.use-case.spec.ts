import { Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { SaveGeneratedImageUseCase } from './save-generated-image.use-case';
import { SaveGeneratedImageCommand } from './save-generated-image.command';
import type { GeneratedImagesRepository } from '../../ports/generated-images.repository';
import type { UploadObjectUseCase } from 'src/domain/storage/application/use-cases/upload-object/upload-object.use-case';
import type { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import { GeneratedImageSaveFailedError } from '../../threads.errors';

// Stable UUID for deterministic tests
const FIXED_UUID = '11111111-1111-1111-1111-111111111111' as UUID;
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomUUID: () => FIXED_UUID,
}));

describe('SaveGeneratedImageUseCase', () => {
  let useCase: SaveGeneratedImageUseCase;
  let generatedImagesRepository: jest.Mocked<GeneratedImagesRepository>;
  let uploadObjectUseCase: jest.Mocked<UploadObjectUseCase>;
  let deleteObjectUseCase: jest.Mocked<DeleteObjectUseCase>;

  const mockOrgId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const mockUserId = '123e4567-e89b-12d3-a456-426614174001' as UUID;
  const mockThreadId = '123e4567-e89b-12d3-a456-426614174002' as UUID;

  beforeEach(() => {
    generatedImagesRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByIdAndThreadId: jest.fn(),
    } as unknown as jest.Mocked<GeneratedImagesRepository>;

    uploadObjectUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<UploadObjectUseCase>;

    deleteObjectUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<DeleteObjectUseCase>;

    useCase = new SaveGeneratedImageUseCase(
      generatedImagesRepository,
      uploadObjectUseCase,
      deleteObjectUseCase,
    );

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createCommand = (): SaveGeneratedImageCommand =>
    new SaveGeneratedImageCommand({
      orgId: mockOrgId,
      userId: mockUserId,
      threadId: mockThreadId,
      imageData: Buffer.from('fake-png-data'),
      contentType: 'image/png',
      isAnonymous: false,
    });

  describe('execute', () => {
    it('should upload to storage and save to repository', async () => {
      const command = createCommand();
      generatedImagesRepository.save.mockResolvedValue(
        {} as ReturnType<typeof generatedImagesRepository.save> extends Promise<
          infer R
        >
          ? R
          : never,
      );

      await useCase.execute(command);

      expect(uploadObjectUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          objectName: `generated-images/${mockOrgId}/${mockThreadId}/${FIXED_UUID}.png`,
        }),
      );
      expect(generatedImagesRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: FIXED_UUID,
          orgId: mockOrgId,
          userId: mockUserId,
          threadId: mockThreadId,
          contentType: 'image/png',
          isAnonymous: false,
        }),
      );
    });

    it('should return { id } with a valid UUID', async () => {
      const command = createCommand();
      generatedImagesRepository.save.mockResolvedValue(
        {} as ReturnType<typeof generatedImagesRepository.save> extends Promise<
          infer R
        >
          ? R
          : never,
      );

      const result = await useCase.execute(command);

      expect(result).toEqual({ id: FIXED_UUID });
    });

    it('should use correct storage key format: generated-images/{orgId}/{threadId}/{imageId}.png', async () => {
      const command = createCommand();
      generatedImagesRepository.save.mockResolvedValue(
        {} as ReturnType<typeof generatedImagesRepository.save> extends Promise<
          infer R
        >
          ? R
          : never,
      );

      await useCase.execute(command);

      const expectedKey = `generated-images/${mockOrgId}/${mockThreadId}/${FIXED_UUID}.png`;
      expect(uploadObjectUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ objectName: expectedKey }),
      );
    });

    it('should clean up the uploaded blob when DB save fails', async () => {
      const command = createCommand();
      generatedImagesRepository.save.mockRejectedValue(
        new Error('DB connection lost'),
      );

      await expect(useCase.execute(command)).rejects.toThrow(
        GeneratedImageSaveFailedError,
      );

      expect(deleteObjectUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          objectName: `generated-images/${mockOrgId}/${mockThreadId}/${FIXED_UUID}.png`,
        }),
      );
    });

    it('should wrap non-ApplicationError in GeneratedImageSaveFailedError', async () => {
      const command = createCommand();
      uploadObjectUseCase.execute.mockRejectedValue(
        new Error('storage failure'),
      );

      await expect(useCase.execute(command)).rejects.toThrow(
        GeneratedImageSaveFailedError,
      );
    });
  });
});

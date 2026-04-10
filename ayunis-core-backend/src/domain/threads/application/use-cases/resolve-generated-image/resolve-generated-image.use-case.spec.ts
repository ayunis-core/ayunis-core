import { Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ResolveGeneratedImageUseCase } from './resolve-generated-image.use-case';
import { ResolveGeneratedImageQuery } from './resolve-generated-image.query';
import type { ThreadsRepository } from '../../ports/threads.repository';
import type { GeneratedImagesRepository } from '../../ports/generated-images.repository';
import type { GetPresignedUrlUseCase } from 'src/domain/storage/application/use-cases/get-presigned-url/get-presigned-url.use-case';
import {
  ThreadNotFoundError,
  GeneratedImageNotFoundError,
} from '../../threads.errors';
import { GeneratedImage } from '../../../domain/generated-image.entity';

describe('ResolveGeneratedImageUseCase', () => {
  let useCase: ResolveGeneratedImageUseCase;
  let threadsRepository: jest.Mocked<ThreadsRepository>;
  let generatedImagesRepository: jest.Mocked<GeneratedImagesRepository>;
  let getPresignedUrlUseCase: jest.Mocked<GetPresignedUrlUseCase>;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const mockThreadId = '123e4567-e89b-12d3-a456-426614174001' as UUID;
  const mockImageId = '123e4567-e89b-12d3-a456-426614174002' as UUID;

  beforeEach(() => {
    threadsRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<ThreadsRepository>;

    generatedImagesRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByIdAndThreadId: jest.fn(),
    } as unknown as jest.Mocked<GeneratedImagesRepository>;

    getPresignedUrlUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetPresignedUrlUseCase>;

    useCase = new ResolveGeneratedImageUseCase(
      threadsRepository,
      generatedImagesRepository,
      getPresignedUrlUseCase,
    );

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should return presigned URL when thread and image exist', async () => {
      const query = new ResolveGeneratedImageQuery(
        mockThreadId,
        mockImageId,
        mockUserId,
      );

      threadsRepository.findOne.mockResolvedValue({
        id: mockThreadId,
      } as ReturnType<typeof threadsRepository.findOne> extends Promise<infer R>
        ? R
        : never);

      const mockImage = new GeneratedImage(
        mockImageId,
        '00000000-0000-0000-0000-000000000000' as UUID,
        mockUserId,
        mockThreadId,
        'image/png',
        false,
        'generated-images/org/thread/image.png',
      );
      generatedImagesRepository.findByIdAndThreadId.mockResolvedValue(
        mockImage,
      );

      const expiresAt = new Date('2026-04-10T12:00:00Z');
      getPresignedUrlUseCase.execute.mockResolvedValue({
        url: 'https://storage.example.com/signed-url',
        expiresAt,
        storageUrl: { bucket: 'b', key: 'k' },
        isExpired: () => false,
      } as unknown as ReturnType<
        typeof getPresignedUrlUseCase.execute
      > extends Promise<infer R>
        ? R
        : never);

      const result = await useCase.execute(query);

      expect(result).toEqual({
        url: 'https://storage.example.com/signed-url',
        expiresAt: expiresAt.toISOString(),
      });
      expect(threadsRepository.findOne).toHaveBeenCalledWith(
        mockThreadId,
        mockUserId,
      );
    });

    it('should throw ThreadNotFoundError when thread not found for user', async () => {
      const query = new ResolveGeneratedImageQuery(
        mockThreadId,
        mockImageId,
        mockUserId,
      );

      threadsRepository.findOne.mockResolvedValue(null);

      await expect(useCase.execute(query)).rejects.toThrow(ThreadNotFoundError);
    });

    it('should throw GeneratedImageNotFoundError when image not found in thread', async () => {
      const query = new ResolveGeneratedImageQuery(
        mockThreadId,
        mockImageId,
        mockUserId,
      );

      threadsRepository.findOne.mockResolvedValue({
        id: mockThreadId,
      } as ReturnType<typeof threadsRepository.findOne> extends Promise<infer R>
        ? R
        : never);
      generatedImagesRepository.findByIdAndThreadId.mockResolvedValue(null);

      await expect(useCase.execute(query)).rejects.toThrow(
        GeneratedImageNotFoundError,
      );
    });
  });
});

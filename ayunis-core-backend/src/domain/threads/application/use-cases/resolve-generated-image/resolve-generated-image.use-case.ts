import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { GetPresignedUrlUseCase } from 'src/domain/storage/application/use-cases/get-presigned-url/get-presigned-url.use-case';
import { GetPresignedUrlCommand } from 'src/domain/storage/application/use-cases/get-presigned-url/get-presigned-url.command';
import { ThreadsRepository } from '../../ports/threads.repository';
import { GeneratedImagesRepository } from '../../ports/generated-images.repository';
import {
  ThreadNotFoundError,
  GeneratedImageNotFoundError,
} from '../../threads.errors';
import { ResolveGeneratedImageQuery } from './resolve-generated-image.query';

const PRESIGNED_URL_EXPIRY_SECONDS = 3600;

export interface ResolveGeneratedImageResult {
  url: string;
  expiresAt: string;
}

@Injectable()
export class ResolveGeneratedImageUseCase {
  private readonly logger = new Logger(ResolveGeneratedImageUseCase.name);

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly generatedImagesRepository: GeneratedImagesRepository,
    private readonly getPresignedUrlUseCase: GetPresignedUrlUseCase,
  ) {}

  async execute(
    query: ResolveGeneratedImageQuery,
  ): Promise<ResolveGeneratedImageResult> {
    this.logger.log('execute', {
      threadId: query.threadId,
      imageId: query.imageId,
    });

    try {
      const thread = await this.threadsRepository.findOne(
        query.threadId,
        query.userId,
      );
      if (!thread) {
        throw new ThreadNotFoundError(query.threadId, query.userId);
      }

      const image = await this.generatedImagesRepository.findByIdAndThreadId(
        query.imageId,
        query.threadId,
      );
      if (!image) {
        throw new GeneratedImageNotFoundError(query.imageId);
      }

      const presignedUrl = await this.getPresignedUrlUseCase.execute(
        new GetPresignedUrlCommand(
          image.storageKey,
          PRESIGNED_URL_EXPIRY_SECONDS,
        ),
      );

      return {
        url: presignedUrl.url,
        expiresAt: presignedUrl.expiresAt.toISOString(),
      };
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Failed to resolve generated image', {
        threadId: query.threadId,
        imageId: query.imageId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

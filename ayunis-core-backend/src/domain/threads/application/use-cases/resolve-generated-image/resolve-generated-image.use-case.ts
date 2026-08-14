import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ApplicationError } from 'src/common/errors/base.error';
import { GetPresignedUrlUseCase } from 'src/domain/storage/application/use-cases/get-presigned-url/get-presigned-url.use-case';
import { GetPresignedUrlCommand } from 'src/domain/storage/application/use-cases/get-presigned-url/get-presigned-url.command';
import { contentTypeToExtension } from 'src/common/util/content-type.util';
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
  constructor(
    @InjectPinoLogger(ResolveGeneratedImageUseCase.name)
    private readonly logger: PinoLogger,
    private readonly threadsRepository: ThreadsRepository,
    private readonly generatedImagesRepository: GeneratedImagesRepository,
    private readonly getPresignedUrlUseCase: GetPresignedUrlUseCase,
  ) {}

  async execute(
    query: ResolveGeneratedImageQuery,
  ): Promise<ResolveGeneratedImageResult> {
    const logContext = {
      threadId: query.threadId,
      imageId: query.imageId,
    };
    this.logger.info(logContext, 'execute');

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

      // Force a safe Content-Type and inline Content-Disposition on the
      // pre-signed URL so the storage origin cannot serve the object with
      // an active-content MIME type (e.g. image/svg+xml) that would
      // otherwise render inline and create a stored-XSS primitive.
      // `image.contentType` is constrained by the save-side allow-list.
      const extension = contentTypeToExtension(image.contentType);
      const presignedUrl = await this.getPresignedUrlUseCase.execute(
        new GetPresignedUrlCommand(
          image.storageKey,
          PRESIGNED_URL_EXPIRY_SECONDS,
          undefined,
          image.contentType,
          `inline; filename="${query.imageId}${extension}"`,
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
      this.logger.error(
        { ...logContext, err: error as Error },
        'Failed to resolve generated image',
      );
      throw error;
    }
  }
}
